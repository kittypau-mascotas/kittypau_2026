-- Data availability / missing-rate checks (KittyPau)
-- Ajusta el intervalo si lo necesitas (últimos 30 días por defecto).

-- ============================================================
-- MAIN: readings (raw/telemetry)
-- ============================================================

-- 1) Volumen + missing rate global
select
  count(*)                                   as n_rows,
  count(*) filter (where weight_grams is null) as n_missing_weight,
  round(100.0 * count(*) filter (where weight_grams is null) / nullif(count(*),0), 2) as pct_missing_weight,
  count(*) filter (where water_ml is null)    as n_missing_water,
  round(100.0 * count(*) filter (where water_ml is null) / nullif(count(*),0), 2)    as pct_missing_water
from public.readings
where ingested_at >= now() - interval '30 days';

-- 2) Por dispositivo (para detectar qué devices reportan qué)
select
  device_id,
  count(*) as n,
  count(*) filter (where weight_grams is not null) as n_weight,
  count(*) filter (where water_ml is not null) as n_water,
  min(ingested_at) as first_ingested_at,
  max(ingested_at) as last_ingested_at
from public.readings
where ingested_at >= now() - interval '30 days'
group by 1
order by n desc
limit 200;

-- ============================================================
-- ANALYTICS: pet_sessions / pet_daily_summary (processed)
-- ============================================================

-- 3) Volumen sesiones
select
  count(*) as n_sessions,
  min(session_start) as min_session_start,
  max(session_start) as max_session_start
from public.pet_sessions
where session_start >= now() - interval '30 days';

-- 4) Volumen resumen diario
select
  count(*) as n_daily,
  min(summary_date) as min_summary_date,
  max(summary_date) as max_summary_date
from public.pet_daily_summary
where summary_date >= now() - interval '30 days';

