WITH bounds AS (
  SELECT
    ((timezone('America/Santiago', now())::date)::timestamp AT TIME ZONE 'America/Santiago') AS start_utc,
    (((timezone('America/Santiago', now())::date + 1)::timestamp) AT TIME ZONE 'America/Santiago') AS end_utc
)
SELECT
  d.device_id,
  COUNT(r.*) AS readings_today,
  MIN(r.recorded_at) AS first_recorded_at,
  MAX(r.recorded_at) AS last_recorded_at
FROM devices d
CROSS JOIN bounds b
LEFT JOIN readings r
  ON r.device_id = d.id
 AND r.recorded_at >= b.start_utc
 AND r.recorded_at < b.end_utc
WHERE d.device_id IN ('KPCL0034','KPCL0036')
GROUP BY d.device_id
ORDER BY d.device_id;
