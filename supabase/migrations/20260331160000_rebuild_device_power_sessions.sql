-- ============================================================
-- Backfill / rebuild device power sessions from readings
-- ============================================================
-- Reconstructs ON/OFF activity sessions from historical readings.
-- Useful for devices like KPCL0034 where we already have telemetry
-- but no explicit battery power state.
-- ============================================================

create or replace function public.rebuild_device_power_sessions(
  p_device_code text default null,
  p_gap_minutes integer default 5
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gap interval := make_interval(mins => p_gap_minutes);
  v_inserted integer := 0;
begin
  delete from public.device_power_sessions s
  using public.devices d
  where s.device_uuid = d.id
    and (p_device_code is null or d.device_id = p_device_code);

  with readings_base as (
    select
      d.id as device_uuid,
      d.device_id as device_code,
      d.device_id as device_label,
      d.device_type,
      d.status as device_status,
      d.device_state,
      r.id as reading_id,
      case
        when coalesce(r.clock_invalid, false) then r.ingested_at
        else r.recorded_at
      end as effective_ts
    from public.readings r
    join public.devices d
      on d.id = r.device_id
    where p_device_code is null
       or d.device_id = p_device_code
  ),
  ordered as (
    select
      *,
      lag(effective_ts) over (
        partition by device_uuid
        order by effective_ts, reading_id
      ) as prev_ts
    from readings_base
  ),
  flagged as (
    select
      *,
      case
        when prev_ts is null then 1
        when effective_ts - prev_ts > v_gap then 1
        else 0
      end as new_session_flag
    from ordered
  ),
  grouped as (
    select
      *,
      sum(new_session_flag) over (
        partition by device_uuid
        order by effective_ts, reading_id
        rows unbounded preceding
      ) as session_grp
    from flagged
  ),
  sessions as (
    select
      device_uuid,
      device_code,
      device_label,
      max(device_type) as device_type,
      max(device_status) as device_status,
      max(device_state) as device_state,
      min(effective_ts) as session_start_at,
      max(effective_ts) as last_seen_at,
      count(*)::integer as readings_count,
      extract(epoch from max(effective_ts) - min(effective_ts))::numeric(12,3) as duration_seconds,
      max(effective_ts) >= now() - v_gap as is_open
    from grouped
    group by device_uuid, device_code, device_label, session_grp
  )
  insert into public.device_power_sessions (
    device_uuid,
    device_code,
    device_label,
    device_type,
    device_status,
    device_state,
    session_status,
    power_state,
    session_start_at,
    last_seen_at,
    session_end_at,
    end_reason,
    readings_count,
    inactivity_threshold_seconds,
    duration_seconds,
    summary,
    notes,
    created_at,
    updated_at
  )
  select
    s.device_uuid,
    s.device_code,
    s.device_label,
    s.device_type,
    s.device_status,
    s.device_state,
    case when s.is_open then 'open' else 'closed' end,
    'on',
    s.session_start_at,
    s.last_seen_at,
    case when s.is_open then null else s.last_seen_at end,
    case when s.is_open then null else format('inactivity_gap_%s_minutes', p_gap_minutes) end,
    s.readings_count,
    p_gap_minutes * 60,
    case
      when s.is_open then extract(epoch from now() - s.session_start_at)::numeric(12,3)
      else s.duration_seconds
    end,
    jsonb_build_object(
      'source', 'historical_rebuild',
      'gap_minutes', p_gap_minutes,
      'is_open', s.is_open
    ),
    case
      when s.is_open then
        'Current power session reconstructed from historical readings.'
      else
        'Historical power session reconstructed from readings gaps.'
    end,
    now(),
    now()
  from sessions s;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

