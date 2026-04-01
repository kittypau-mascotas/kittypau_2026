-- ============================================================
-- Device operation history for KittyPaw
-- ============================================================
-- Stores observed runtime intervals per device, derived from readings.
-- First seed row captures the initial KPCL0034 operating window.
-- Note: battery_level is NULL in the current readings sample, so this
-- record stores observed runtime rather than a measured battery duration.
-- ============================================================

create table if not exists public.device_operation_records (
  id bigserial primary key,
  device_uuid uuid not null references public.devices(id) on delete cascade,
  device_code text not null,
  device_label text,
  device_type text,
  device_status text,
  device_state text,
  device_last_seen timestamptz,
  source_readings_count integer not null default 0,
  active_start timestamptz not null,
  active_end timestamptz not null,
  active_duration_seconds numeric(12,3) not null,
  battery_samples integer not null default 0,
  battery_level_start numeric,
  battery_level_end numeric,
  battery_level_min numeric,
  battery_level_max numeric,
  battery_level_avg numeric,
  summary jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.device_operation_records
  add column if not exists device_last_seen timestamptz,
  add column if not exists source_readings_count integer not null default 0,
  add column if not exists active_start timestamptz,
  add column if not exists active_end timestamptz,
  add column if not exists active_duration_seconds numeric(12,3),
  add column if not exists battery_samples integer not null default 0,
  add column if not exists battery_level_start numeric,
  add column if not exists battery_level_end numeric,
  add column if not exists battery_level_min numeric,
  add column if not exists battery_level_max numeric,
  add column if not exists battery_level_avg numeric,
  add column if not exists summary jsonb not null default '{}'::jsonb,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_device_operation_records_device_active_start
  on public.device_operation_records (device_uuid, active_start);

create index if not exists idx_device_operation_records_device_code
  on public.device_operation_records (device_code, active_start desc);

alter table public.device_operation_records enable row level security;

-- Only service role / postgres should use this table for writes.
-- No anon/authenticated policies are added on purpose.

with device_ctx as (
  select
    d.id as device_uuid,
    d.device_id as device_code,
    d.device_type,
    d.status as device_status,
    d.device_state,
    d.last_seen as device_last_seen
  from public.devices d
  where d.device_id = 'KPCL0034'
  limit 1
),
reading_rows as (
  select
    r.id as reading_id,
    r.device_id,
    case
      when coalesce(r.clock_invalid, false) then r.ingested_at
      else r.recorded_at
    end as effective_ts,
    r.battery_level
  from public.readings r
  join device_ctx d
    on d.device_uuid = r.device_id
),
first_last as (
  select
    d.device_uuid,
    d.device_code,
    d.device_type,
    d.device_status,
    d.device_state,
    d.device_last_seen,
    count(*)::integer as source_readings_count,
    min(rr.effective_ts) as active_start,
    max(rr.effective_ts) as active_end,
    extract(epoch from max(rr.effective_ts) - min(rr.effective_ts))::numeric(12,3) as active_duration_seconds,
    count(rr.battery_level)::integer as battery_samples,
    (select battery_level from reading_rows order by effective_ts asc, reading_id asc limit 1) as battery_level_start,
    (select battery_level from reading_rows order by effective_ts desc, reading_id desc limit 1) as battery_level_end,
    min(rr.battery_level) as battery_level_min,
    max(rr.battery_level) as battery_level_max,
    avg(rr.battery_level) as battery_level_avg,
    jsonb_build_object(
      'device_code', d.device_code,
      'device_type', d.device_type,
      'device_status', d.device_status,
      'device_state', d.device_state,
      'source_readings_count', count(*),
      'battery_samples', count(rr.battery_level),
      'active_start', min(rr.effective_ts),
      'active_end', max(rr.effective_ts),
      'active_duration_seconds', extract(epoch from max(rr.effective_ts) - min(rr.effective_ts)),
      'battery_level_null', (count(rr.battery_level) = 0)
    ) as summary,
    case
      when count(rr.battery_level) = 0 then
        format(
          'KPCL0034 observed runtime from %s to %s (%s seconds). Battery telemetry was not reported in readings.',
          min(rr.effective_ts),
          max(rr.effective_ts),
          extract(epoch from max(rr.effective_ts) - min(rr.effective_ts))
        )
      else
        format(
          'KPCL0034 observed runtime from %s to %s (%s seconds).',
          min(rr.effective_ts),
          max(rr.effective_ts),
          extract(epoch from max(rr.effective_ts) - min(rr.effective_ts))
        )
    end as notes
  from device_ctx d
  cross join reading_rows rr
  group by
    d.device_uuid,
    d.device_code,
    d.device_type,
    d.device_status,
    d.device_state,
    d.device_last_seen
)
insert into public.device_operation_records (
  device_uuid,
  device_code,
  device_label,
  device_type,
  device_status,
  device_state,
  device_last_seen,
  source_readings_count,
  active_start,
  active_end,
  active_duration_seconds,
  battery_samples,
  battery_level_start,
  battery_level_end,
  battery_level_min,
  battery_level_max,
  battery_level_avg,
  summary,
  notes,
  created_at,
  updated_at
)
select
  fl.device_uuid,
  fl.device_code,
  fl.device_code as device_label,
  fl.device_type,
  fl.device_status,
  fl.device_state,
  fl.device_last_seen,
  fl.source_readings_count,
  fl.active_start,
  fl.active_end,
  fl.active_duration_seconds,
  fl.battery_samples,
  fl.battery_level_start,
  fl.battery_level_end,
  fl.battery_level_min,
  fl.battery_level_max,
  fl.battery_level_avg,
  fl.summary,
  fl.notes,
  now(),
  now()
from first_last fl
where fl.source_readings_count > 0
on conflict (device_uuid, active_start)
do update set
  device_code = excluded.device_code,
  device_label = excluded.device_label,
  device_type = excluded.device_type,
  device_status = excluded.device_status,
  device_state = excluded.device_state,
  device_last_seen = excluded.device_last_seen,
  source_readings_count = excluded.source_readings_count,
  active_end = excluded.active_end,
  active_duration_seconds = excluded.active_duration_seconds,
  battery_samples = excluded.battery_samples,
  battery_level_start = excluded.battery_level_start,
  battery_level_end = excluded.battery_level_end,
  battery_level_min = excluded.battery_level_min,
  battery_level_max = excluded.battery_level_max,
  battery_level_avg = excluded.battery_level_avg,
  summary = excluded.summary,
  notes = excluded.notes,
  updated_at = now();
