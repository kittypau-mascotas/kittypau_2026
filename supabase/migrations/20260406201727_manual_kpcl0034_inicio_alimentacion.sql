-- ============================================================
-- Manual bowl category observation for KPCL0034
-- ============================================================
-- Immutable history event for the current plate state:
-- the bowl on KPCL0034 was marked as the start of feeding.
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
  'manual_bowl_category',
  null,
  'device',
  d.device_uuid,
  jsonb_build_object(
    'source', 'manual_observation',
    'device_code', d.device_code,
    'device_type', d.device_type,
    'device_status', d.device_status,
    'device_state', d.device_state,
    'category_key', 'inicio_alimentacion',
    'category_label', 'INICIO ALIMENTACION',
    'observed_at', '2026-04-07T00:17:41+00:00',
    'notes', 'KPCL0034 was categorized as the start of feeding.'
  ),
  timestamptz '2026-04-07 00:17:41+00'
from device_ctx d;
