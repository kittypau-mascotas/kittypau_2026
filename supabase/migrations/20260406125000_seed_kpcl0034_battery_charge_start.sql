-- ============================================================
-- Manual battery charge start for KPCL0034
-- ============================================================
-- Seed row used to keep the start of the charging window
-- for future battery calculations and reporting.
--
-- Observation:
--   KPCL0034 started charging on 2026-04-06 12:50 local time
--   (America/Santiago).
-- ============================================================

with device_ctx as (
  select
    d.id as device_uuid,
    d.device_id as device_code,
    d.device_type,
    d.status as device_status,
    d.device_state
  from public.devices d
  where d.device_id = 'KPCL0034'
  limit 1
),
ts as (
  select timestamptz '2026-04-06 12:50:00-03' as charging_start_at
),
closed_battery_only as (
  update public.device_battery_cycles c
  set
    battery_only_end_at = coalesce(c.battery_only_end_at, ts.charging_start_at),
    cycle_end_at = coalesce(c.cycle_end_at, ts.charging_start_at),
    total_duration_seconds = coalesce(
      c.total_duration_seconds,
      extract(epoch from ts.charging_start_at - c.cycle_start_at)::numeric(12,3)
    ),
    battery_only_duration_seconds = case
      when c.battery_only_start_at is not null then
        extract(epoch from coalesce(c.battery_only_end_at, ts.charging_start_at) - c.battery_only_start_at)::numeric(12,3)
      else c.battery_only_duration_seconds
    end,
    cycle_status = 'closed',
    summary = jsonb_set(
      coalesce(c.summary, '{}'::jsonb),
      '{manual_transition}',
      to_jsonb('charging_started'::text),
      true
    ),
    notes = concat_ws(
      E'\n',
      c.notes,
      'Manual charging start recorded at 2026-04-06 12:50 local time.'
    ),
    updated_at = now()
  from device_ctx d, ts
  where c.device_uuid = d.device_uuid
    and c.cycle_status = 'battery_only'
    and c.cycle_end_at is null
  returning c.id
)
insert into public.device_battery_cycles (
  device_uuid,
  device_code,
  device_label,
  device_type,
  device_status,
  device_state,
  cycle_status,
  cycle_start_at,
  charging_start_at,
  full_charge_at,
  unplugged_at,
  battery_only_start_at,
  battery_only_end_at,
  cycle_end_at,
  battery_level_at_start,
  battery_level_at_full_charge,
  battery_level_at_end,
  battery_voltage_at_start,
  battery_voltage_at_full_charge,
  battery_voltage_at_end,
  battery_state_at_start,
  battery_state_at_full_charge,
  battery_state_at_end,
  battery_source_at_start,
  battery_source_at_full_charge,
  battery_source_at_end,
  readings_count,
  charging_samples,
  battery_only_samples,
  charging_duration_seconds,
  battery_only_duration_seconds,
  total_duration_seconds,
  battery_component_code,
  charger_component_code,
  battery_capacity_mah,
  battery_nominal_voltage_v,
  estimated_charge_current_ma,
  estimated_full_charge_hours,
  battery_bom_context,
  summary,
  notes,
  created_at,
  updated_at
)
select
  d.device_uuid,
  d.device_code,
  d.device_code as device_label,
  d.device_type,
  d.device_status,
  d.device_state,
  'charging',
  ts.charging_start_at,
  ts.charging_start_at,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  'charging',
  null,
  null,
  'external_power',
  null,
  null,
  0,
  0,
  0,
  null,
  null,
  null,
  'BATT_LIPO_602025',
  'CHG_TP4056_TYPEC',
  250,
  3.7,
  null,
  null,
  jsonb_build_object(
    'source', 'manual_observation',
    'device_code', d.device_code,
    'battery_component_codes', jsonb_build_array('BATT_LIPO_602025', 'BATT_LIPO_502030'),
    'charger_component_codes', jsonb_build_array('CHG_TP4056_TYPEC', 'CHG_LIPO_TYPEC'),
    'battery_capacity_mah', 250,
    'battery_nominal_voltage_v', 3.7,
    'note', 'Manual charging start used as a planning baseline until real battery telemetry is available.'
  ),
  jsonb_build_object(
    'source', 'manual_observation',
    'event', 'charging_start',
    'device_code', d.device_code,
    'window_start', '2026-04-06T12:50:00-03:00',
    'battery_telemetry', 'not_available',
    'calculation_note', 'Start of charge recorded manually for future battery calculations.'
  ),
  'KPCL0034 manual charging start observation. Charging began at 12:50 local time for future battery calculations.',
  now(),
  now()
from device_ctx d, ts
on conflict (device_uuid, cycle_start_at)
do update set
  device_code = excluded.device_code,
  device_label = excluded.device_label,
  device_type = excluded.device_type,
  device_status = excluded.device_status,
  device_state = excluded.device_state,
  cycle_status = excluded.cycle_status,
  charging_start_at = excluded.charging_start_at,
  battery_level_at_start = excluded.battery_level_at_start,
  battery_voltage_at_start = excluded.battery_voltage_at_start,
  battery_state_at_start = excluded.battery_state_at_start,
  battery_source_at_start = excluded.battery_source_at_start,
  readings_count = excluded.readings_count,
  charging_samples = excluded.charging_samples,
  battery_component_code = excluded.battery_component_code,
  charger_component_code = excluded.charger_component_code,
  battery_capacity_mah = excluded.battery_capacity_mah,
  battery_nominal_voltage_v = excluded.battery_nominal_voltage_v,
  estimated_charge_current_ma = excluded.estimated_charge_current_ma,
  estimated_full_charge_hours = excluded.estimated_full_charge_hours,
  battery_bom_context = excluded.battery_bom_context,
  summary = excluded.summary,
  notes = excluded.notes,
  updated_at = now();
