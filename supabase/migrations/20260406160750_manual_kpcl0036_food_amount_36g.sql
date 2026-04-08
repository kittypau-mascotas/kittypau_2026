-- ============================================================
-- Manual food amount observation for KPCL0036
-- ============================================================
-- Immutable history event for the current plate state:
-- after tare, the plate now contains 36 g of food.
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
  'manual_food_amount',
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
    'food_amount_g', 36,
    'food_amount_basis', 'net_after_tare',
    'tare_reference_g', 0,
    'observed_at', '2026-04-06T16:07:50-04:00',
    'notes', 'Food added after tare; current net amount recorded at 36 g.'
  ),
  timestamptz '2026-04-06 16:07:50-04'
from device_ctx d;
