-- ============================================================
-- Manual tare, refill and descent sequence for KPCL0036
-- ============================================================
-- Immutable history events for the current plate state:
-- tare starts at 20:05:12, finishes at 20:07:00, food is added
-- by 20:07:10 and the weight starts descending from there.
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
  'manual_plate_tare_start',
  null,
  'device',
  d.device_uuid,
  jsonb_build_object(
    'source', 'manual_observation',
    'device_code', d.device_code,
    'device_type', d.device_type,
    'device_status', d.device_status,
    'device_state', d.device_state,
    'phase', 'tare_start',
    'observed_at', '2026-04-06T20:05:12.356102+00:00',
    'notes', 'Tare process started for KPCL0036.'
  ),
  timestamptz '2026-04-06 20:05:12.356102+00'
from device_ctx d;

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
    'tare_reference_g', 0,
    'observed_at', '2026-04-06T20:07:00.191354+00:00',
    'notes', 'Tare finished and plate baseline remained at 0 g.'
  ),
  timestamptz '2026-04-06 20:07:00.191354+00'
from device_ctx d;

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
  'manual_food_refill',
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
    'food_added_observed', true,
    'descent_started', true,
    'observed_at', '2026-04-06T20:07:10.132855+00:00',
    'notes', 'Food was added to the plate and the weight started descending from this point.'
  ),
  timestamptz '2026-04-06 20:07:10.132855+00'
from device_ctx d;

