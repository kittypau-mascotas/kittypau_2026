-- ============================================================
-- KittyPau - Reinicio de muestras reales
-- Objetivo:
--   1) Borrar todo el historico de sensores hasta hace 14 dias.
--   2) Borrar TODO lo asociado a KPCL0034.
--   3) Dejar intactos profiles/pets/devices para no romper el setup.
--
-- Aviso:
--   Ejecutar primero los SELECT de vista previa.
--   Este script usa la DB principal de Supabase.
--   La base analitica separada ya se considera legado;
--   el bloque final se conserva solo como referencia historica.
-- ============================================================

-- Fecha de corte: todo lo anterior a este punto se borra.
-- Si quieres otra ventana, cambia el intervalo de 14 days.
with params as (
  select now() - interval '14 days' as cutoff
)
select cutoff from params;

-- ============================================================
-- 1) VISTAS PREVIAS
-- ============================================================

-- Conteo general en la DB principal
select 'readings' as table_name, count(*) as rows from public.readings
union all
select 'sensor_readings', count(*) from public.sensor_readings
union all
select 'devices', count(*) from public.devices;

-- Conteo de KPCL0034 antes del borrado
select
  'KPCL0034_readings' as scope,
  count(*) as rows
from public.readings r
join public.devices d on d.id = r.device_id
where d.device_id = 'KPCL0034'
union all
select
  'KPCL0034_sensor_readings',
  count(*)
from public.sensor_readings
where device_id = 'KPCL0034';

-- Conteo historico a borrar por ventana temporal
select
  'readings_older_than_14d' as scope,
  count(*) as rows
from public.readings
where recorded_at < now() - interval '14 days'
union all
select
  'sensor_readings_older_than_14d',
  count(*)
from public.sensor_readings
where coalesce(device_timestamp, ingested_at) < now() - interval '14 days';

-- ============================================================
-- 2) LIMPIEZA DB PRINCIPAL
-- ============================================================

begin;

-- Borrar todo lo de KPCL0034 en readings
delete from public.readings r
using public.devices d
where r.device_id = d.id
  and d.device_id = 'KPCL0034';

-- Borrar readings historicos anteriores a 14 dias
delete from public.readings
where recorded_at < now() - interval '14 days';

-- Borrar todo lo de KPCL0034 en sensor_readings
delete from public.sensor_readings
where device_id = 'KPCL0034';

-- Borrar sensor_readings historicos anteriores a 14 dias
delete from public.sensor_readings
where coalesce(device_timestamp, ingested_at) < now() - interval '14 days';

commit;

-- ============================================================
-- 3) OPCIONAL: DB ANALITICA SEPARADA
--    Mantener solo como referencia historica si existiera ese esquema legado.
-- ============================================================

-- begin;
--
-- delete from public.pet_sessions
-- where device_id = 'KPCL0034'
--    or session_start < now() - interval '14 days';
--
-- delete from public.pet_daily_summary
-- where summary_date < (current_date - 14);
--
-- commit;



