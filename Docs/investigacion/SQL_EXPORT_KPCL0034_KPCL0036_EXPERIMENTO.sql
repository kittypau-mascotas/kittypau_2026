-- ============================================================
-- Export canonico de data para el experimento compartido
-- KPCL0034 + KPCL0036
-- Rango base:
--   desde las 20:00 de hoy en America/Santiago, expresado en UTC,
--   hasta ahora (now()).
-- 
-- Uso recomendado:
--   - ejecutar en Supabase SQL Editor
--   - exportar el resultado a CSV
--   - conservarlo como evidencia de la corrida compartida
-- ============================================================

with params as (
  select
    (
      date_trunc('day', timezone('America/Santiago', now()))
      + interval '20 hours'
    ) at time zone 'America/Santiago' as from_at,
    now() as to_at
),
device_ctx as (
  select
    d.id as device_uuid,
    d.device_id as device_code,
    d.device_type,
    d.status as device_status,
    d.device_state,
    d.plate_weight_grams
  from public.devices d
  where d.device_id in ('KPCL0034', 'KPCL0036')
),
reading_rows as (
  select
    'reading'::text as row_source,
    case
      when d.device_code = 'KPCL0034' then
        case
          when r.recorded_at < timestamptz '2026-04-06 21:42:34+00:00' then 'sin_categoria'
          when r.recorded_at < timestamptz '2026-04-06 21:43:34+00:00' then 'tare_record'
          when r.recorded_at < timestamptz '2026-04-06 21:44:03+00:00' then 'food_fill_start'
          else 'food_fill_end'
        end
      when d.device_code = 'KPCL0036' then
        case
          when r.recorded_at < timestamptz '2026-04-06 21:42:22+00:00' then 'sin_categoria'
          when r.recorded_at < timestamptz '2026-04-06 21:43:48+00:00' then 'tare_record'
          when r.recorded_at < timestamptz '2026-04-06 21:44:27+00:00' then 'food_fill_start'
          else 'food_fill_end'
        end
      else 'sin_categoria'
    end as evento,
    d.device_code,
    d.device_uuid,
    r.recorded_at as event_at,
    r.ingested_at,
    null::text as event_type,
    null::jsonb as payload,
    r.clock_invalid,
    r.weight_grams,
    case
      when r.weight_grams is not null and d.plate_weight_grams is not null
        then greatest(0, r.weight_grams - d.plate_weight_grams)
      else null
    end as food_content_g,
    r.water_ml,
    r.flow_rate,
    r.temperature,
    r.humidity,
    r.battery_level,
    d.plate_weight_grams as plate_weight_grams_device,
    null::numeric as battery_voltage,
    null::text as battery_state,
    null::text as battery_source,
    d.device_type,
    d.device_status,
    d.device_state
  from public.readings r
  join device_ctx d
    on d.device_uuid = r.device_id
  join params p
    on r.recorded_at >= p.from_at
   and r.recorded_at <= p.to_at
),
audit_rows as (
  select
    'audit_event'::text as row_source,
    case
      when ae.event_type = 'manual_bowl_category' then
        coalesce(nullif(trim(ae.payload->>'category'), ''), 'sin_categoria')
      when ae.event_type = 'manual_plate_tare_start' then 'tare_record'
      when ae.event_type = 'manual_plate_tare' then 'plate_weight'
      when ae.event_type = 'manual_food_refill' then 'food_fill_start'
      when ae.event_type = 'manual_food_refill_end' then 'food_fill_end'
      when ae.event_type = 'manual_plate_observation' then 'plate_observation'
      when ae.event_type = 'manual_food_amount' then 'manual_food_amount'
      else 'otro_evento'
    end as evento,
    d.device_code,
    d.device_uuid,
    ae.created_at as event_at,
    null::timestamptz as ingested_at,
    ae.event_type,
    ae.payload,
    null::boolean as clock_invalid,
    null::int as weight_grams,
    null::int as food_content_g,
    null::int as water_ml,
    null::numeric as flow_rate,
    null::numeric as temperature,
    null::numeric as humidity,
    null::int as battery_level,
    d.plate_weight_grams as plate_weight_grams_device,
    null::numeric as battery_voltage,
    null::text as battery_state,
    null::text as battery_source,
    d.device_type,
    d.device_status,
    d.device_state
  from public.audit_events ae
  join device_ctx d
    on d.device_uuid = ae.entity_id
  join params p
    on ae.created_at >= p.from_at
   and ae.created_at <= p.to_at
  where ae.entity_type = 'device'
),
combined as (
  select * from reading_rows
  union all
  select * from audit_rows
)
select *
from combined
order by event_at asc, row_source asc, device_code asc;
