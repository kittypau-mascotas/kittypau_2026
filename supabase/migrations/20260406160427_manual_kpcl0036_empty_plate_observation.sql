-- ============================================================
-- Manual empty-plate observation for KPCL0036
-- ============================================================
-- Immutable history event for the current physical state:
-- the food plate is mounted on the device, but there is no food.
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
)
insert into public.audit_events (
  event_type,
  actor_id,
  entity_type,
  entity_id,
  payload,
  created_at
)
select
  'manual_plate_observation',
  null,
  'device',
  d.device_uuid,
  jsonb_build_object(
    'source', 'manual_observation',
    'device_code', d.device_code,
    'device_type', d.device_type,
    'device_status', d.device_status,
    'device_state', d.device_state,
    'plate_presence', true,
    'food_present', false,
    'plate_state', 'mounted_empty',
    'location', 'on_kpcl',
    'observed_at', '2026-04-06T16:04:27-04:00',
    'notes', 'Food plate is mounted on KPCL0036 and currently has no food.'
  ),
  timestamptz '2026-04-06 16:04:27-04'
from device_ctx d;
