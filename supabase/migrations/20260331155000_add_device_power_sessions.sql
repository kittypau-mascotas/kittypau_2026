-- ============================================================
-- Device power sessions for Kittypau
-- ============================================================
-- This table tracks ON/OFF operational sessions using telemetry activity.
-- It does NOT require battery telemetry.
--
-- What we can detect automatically with current resources:
--   - device started sending readings (ON)
--   - device stopped sending readings for longer than the threshold (OFF inferred)
--   - duration of each observed power session
--
-- What we cannot detect automatically yet:
--   - real charging start/end
--   - 100% battery charge
--   - battery-only vs external-power transitions
--   Those require actual battery telemetry in readings.
-- ============================================================

create table if not exists public.device_power_sessions (
  id bigserial primary key,
  device_uuid uuid not null references public.devices(id) on delete cascade,
  device_code text not null,
  device_label text,
  device_type text,
  device_status text,
  device_state text,
  session_status text not null default 'open',
  power_state text not null default 'on',
  session_start_at timestamptz not null,
  last_seen_at timestamptz not null,
  session_end_at timestamptz,
  end_reason text,
  readings_count integer not null default 0,
  inactivity_threshold_seconds integer not null default 300,
  duration_seconds numeric(12,3),
  summary jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_power_sessions_status_check
    check (session_status in ('open', 'closed')),
  constraint device_power_sessions_power_state_check
    check (power_state in ('on', 'off', 'unknown'))
);

alter table public.device_power_sessions
  add column if not exists device_label text,
  add column if not exists device_type text,
  add column if not exists device_status text,
  add column if not exists device_state text,
  add column if not exists session_status text not null default 'open',
  add column if not exists power_state text not null default 'on',
  add column if not exists session_start_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists session_end_at timestamptz,
  add column if not exists end_reason text,
  add column if not exists readings_count integer not null default 0,
  add column if not exists inactivity_threshold_seconds integer not null default 300,
  add column if not exists duration_seconds numeric(12,3),
  add column if not exists summary jsonb not null default '{}'::jsonb,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_device_power_sessions_device_start
  on public.device_power_sessions (device_uuid, session_start_at);

create index if not exists idx_device_power_sessions_device_code
  on public.device_power_sessions (device_code, session_start_at desc);

create index if not exists idx_device_power_sessions_open_last_seen
  on public.device_power_sessions (device_uuid, last_seen_at desc)
  where session_status = 'open';

alter table public.device_power_sessions enable row level security;

-- No anon/authenticated policies on purpose.

create or replace function public.sync_device_power_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device_uuid uuid;
  v_device_code text;
  v_device_type text;
  v_device_status text;
  v_device_state text;
  v_ts timestamptz;
  v_gap_seconds integer := 300;
  v_open_session record;
begin
  select
    d.id,
    d.device_id,
    d.device_type,
    d.status,
    d.device_state
  into
    v_device_uuid,
    v_device_code,
    v_device_type,
    v_device_status,
    v_device_state
  from public.devices d
  where d.id = new.device_id
  limit 1;

  if v_device_uuid is null then
    return new;
  end if;

  v_ts := coalesce(
    case
      when coalesce(new.clock_invalid, false) then new.ingested_at
      else new.recorded_at
    end,
    new.recorded_at,
    new.ingested_at,
    now()
  );

  select *
  into v_open_session
  from public.device_power_sessions s
  where s.device_uuid = v_device_uuid
    and s.session_status = 'open'
  order by s.session_start_at desc
  limit 1
  for update;

  if found then
    if v_ts > v_open_session.last_seen_at + make_interval(secs => v_gap_seconds) then
      update public.device_power_sessions
      set
        session_status = 'closed',
        power_state = 'off',
        session_end_at = last_seen_at,
        duration_seconds = extract(epoch from last_seen_at - session_start_at)::numeric(12,3),
        end_reason = coalesce(end_reason, format('inactivity_gap_%s_seconds', v_gap_seconds)),
        updated_at = now()
      where id = v_open_session.id;

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
        readings_count,
        inactivity_threshold_seconds,
        duration_seconds,
        summary,
        notes,
        created_at,
        updated_at
      )
      values (
        v_device_uuid,
        v_device_code,
        v_device_code,
        v_device_type,
        v_device_status,
        v_device_state,
        'open',
        'on',
        v_ts,
        v_ts,
        null,
        1,
        v_gap_seconds,
        null,
        jsonb_build_object(
          'source', 'readings_trigger',
          'event', 'session_opened_after_gap'
        ),
        'Power session opened automatically from readings activity.',
        now(),
        now()
      );
    else
      update public.device_power_sessions
      set
        last_seen_at = greatest(last_seen_at, v_ts),
        readings_count = readings_count + 1,
        duration_seconds = extract(epoch from greatest(last_seen_at, v_ts) - session_start_at)::numeric(12,3),
        summary = jsonb_set(
          coalesce(summary, '{}'::jsonb),
          '{last_event}',
          to_jsonb('reading'::text),
          true
        ),
        updated_at = now()
      where id = v_open_session.id;
    end if;
  else
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
      readings_count,
      inactivity_threshold_seconds,
      summary,
      notes,
      created_at,
      updated_at
    )
    values (
      v_device_uuid,
      v_device_code,
      v_device_code,
      v_device_type,
      v_device_status,
      v_device_state,
      'open',
      'on',
      v_ts,
      v_ts,
      1,
      v_gap_seconds,
      jsonb_build_object(
        'source', 'readings_trigger',
        'event', 'session_opened'
      ),
      'Power session opened automatically from readings activity.',
      now(),
      now()
    );
  end if;

  return new;
end;
$$;

create or replace function public.close_stale_device_power_sessions(p_gap_minutes integer default 5)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gap interval := make_interval(mins => p_gap_minutes);
  v_closed integer := 0;
begin
  update public.device_power_sessions s
  set
    session_status = 'closed',
    power_state = 'off',
    session_end_at = coalesce(s.session_end_at, s.last_seen_at),
    duration_seconds = extract(epoch from coalesce(s.session_end_at, s.last_seen_at) - s.session_start_at)::numeric(12,3),
    end_reason = coalesce(s.end_reason, format('stale_inactivity_%s_minutes', p_gap_minutes)),
    updated_at = now()
  where s.session_status = 'open'
    and s.last_seen_at < now() - v_gap;

  get diagnostics v_closed = row_count;
  return v_closed;
end;
$$;

drop trigger if exists trg_sync_device_power_session on public.readings;

create trigger trg_sync_device_power_session
after insert or update of recorded_at, ingested_at, clock_invalid
on public.readings
for each row
execute function public.sync_device_power_session();


