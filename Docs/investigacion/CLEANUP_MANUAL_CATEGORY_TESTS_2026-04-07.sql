-- Limpieza de pruebas de botones de categorias (KPCL0034/KPCL0036).
-- Ajusta el rango si necesitas ampliar o reducir la ventana de limpieza.

with params as (
  select
    now() - interval '6 hours' as from_at,
    now() as to_at
),
target_devices as (
  select id, device_id
  from public.devices
  where device_id in ('KPCL0034', 'KPCL0036')
),
deleted as (
  delete from public.audit_events ae
  using target_devices d, params p
  where ae.entity_id = d.id
    and ae.created_at >= p.from_at
    and ae.created_at <= p.to_at
    and ae.entity_type = 'device'
    and ae.event_type = 'manual_bowl_category'
    and coalesce(ae.payload->>'source', '') = 'today'
  returning ae.id, ae.created_at
)
select count(*) as deleted_rows
from deleted;
