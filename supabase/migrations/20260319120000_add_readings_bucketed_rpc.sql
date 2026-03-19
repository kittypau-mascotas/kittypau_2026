-- RPC: readings_bucketed
-- Devuelve lecturas agregadas (promedio) por intervalo de tiempo.
-- Usado por /api/readings/bucketed para los gráficos de histórico (1d, 1w).
--
-- Params:
--   p_device_id  uuid        — devices.id (no el hardware device_id)
--   p_from       timestamptz — inicio de la ventana
--   p_bucket_s   int         — tamaño del bucket en segundos (ej: 300 = 5min, 1800 = 30min)
--   p_limit      int         — máximo de buckets a devolver (default 400)

CREATE OR REPLACE FUNCTION public.readings_bucketed(
  p_device_id  uuid,
  p_from       timestamptz,
  p_bucket_s   int  DEFAULT 300,
  p_limit      int  DEFAULT 400
)
RETURNS TABLE (
  bucket_time   timestamptz,
  weight_grams  double precision,
  temperature   double precision,
  humidity      double precision,
  light_percent double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_timestamp(floor(extract(epoch FROM recorded_at) / p_bucket_s) * p_bucket_s) AS bucket_time,
    avg(weight_grams)  AS weight_grams,
    avg(temperature)   AS temperature,
    avg(humidity)      AS humidity,
    avg(light_percent) AS light_percent
  FROM readings
  WHERE device_id  = p_device_id
    AND recorded_at >= p_from
  GROUP BY 1
  ORDER BY 1 DESC
  LIMIT p_limit;
$$;

-- Permisos: solo service_role puede llamar esta función (no anon/authenticated)
REVOKE ALL ON FUNCTION public.readings_bucketed FROM PUBLIC;
REVOKE ALL ON FUNCTION public.readings_bucketed FROM anon;
REVOKE ALL ON FUNCTION public.readings_bucketed FROM authenticated;
GRANT EXECUTE ON FUNCTION public.readings_bucketed TO service_role;
