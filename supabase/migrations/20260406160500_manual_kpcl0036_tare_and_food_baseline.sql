-- ============================================================
-- Manual tare and food baseline for KPCL0036
-- ============================================================
-- Immutable history event for the current plate state:
-- the plate was tared to zero so the current food baseline can
-- be recorded from that point forward.
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
  'manual_plate_tare',
  null,
  'device',
  d.device_uuid,
  jsonb_build_object(
    'source', 'manual_observation',
    'device_code', d.device_code,
    'device_type', d.device_type,
    'device_status', d.device_status,
    'device_state', d.device_state,
    'tare_applied', true,
    'plate_zeroed', true,
    'food_amount_g', 0,
    'food_amount_basis', 'net_after_tare',
    'observed_at', '2026-04-06T16:05:00-04:00',
    'notes', 'Plate tared to zero to keep the current food baseline at 0 g from this observation point.'
  ),
  timestamptz '2026-04-06 16:05:00-04'
from device_ctx d;
