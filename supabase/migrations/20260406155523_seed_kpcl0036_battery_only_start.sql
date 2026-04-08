-- ============================================================
-- Manual battery-only start for KPCL0036
-- ============================================================
-- Seed row used to mark the beginning of the autonomy window
-- after unplugging the charger while the indicator was blue / full.
--
-- Observation:
--   KPCL0036 was unplugged on 2026-04-06 15:55:23 local time
--   (America/Santiago), starting the battery-only autonomy window.
-- ============================================================

with device_ctx as (
  select
    d.id as device_uuid,
    d.device_id as device_code,
    d.device_type,
    d.status as device_status,
    d.device_state
  from public.devices d
  where d.device_id = 'KPCL0036'
  limit 1
),
ts as (
  select timestamptz '2026-04-06 15:55:23-04' as battery_only_start_at
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
  unplugged_at,
  battery_only_start_at,
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
  'battery_only',
  ts.battery_only_start_at,
  ts.battery_only_start_at,
  ts.battery_only_start_at,
  null,
  100,
  null,
  null,
  null,
  null,
  null,
  'optimal',
  null,
  null,
  'battery',
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
    'event', 'battery_only_start',
    'indicator_color', 'blue',
    'battery_level_at_start', 100,
    'window_start', '2026-04-06T15:55:23-04:00',
    'battery_telemetry', 'not_available',
    'calculation_note', 'Start of autonomy window after unplugging the charger while the device was still full.'
  ),
  jsonb_build_object(
    'source', 'manual_observation',
    'event', 'battery_only_start',
    'device_code', d.device_code,
    'window_start', '2026-04-06T15:55:23-04:00',
    'indicator_color', 'blue',
    'battery_level_at_start', 100,
    'battery_telemetry', 'not_available',
    'notes', 'Manual autonomy start recorded after charger removal.'
  ),
  'KPCL0036 manual battery-only start observation. The charger was unplugged at 15:55:23 local time while the device was blue/full, starting the autonomy window.',
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
  unplugged_at = excluded.unplugged_at,
  battery_only_start_at = excluded.battery_only_start_at,
  battery_level_at_start = excluded.battery_level_at_start,
  battery_voltage_at_start = excluded.battery_voltage_at_start,
  battery_state_at_start = excluded.battery_state_at_start,
  battery_source_at_start = excluded.battery_source_at_start,
  readings_count = excluded.readings_count,
  charging_samples = excluded.charging_samples,
  battery_only_samples = excluded.battery_only_samples,
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
