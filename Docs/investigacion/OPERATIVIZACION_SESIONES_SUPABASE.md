# Operativizacion en Supabase: sesiones auditadas (servido y alimentacion)

Fecha: 2026-04-27

## Fuente canonica

- `public.audit_events`
- `event_type = 'manual_bowl_category'`
- Categorias pareadas:
  - `inicio_alimentacion` -> `termino_alimentacion`
  - `inicio_servido` -> `termino_servido`
  - `inicio_hidratacion` -> `termino_hidratacion`

## Estructura operativa creada

Migracion: `supabase/migrations/20260427190500_add_device_bowl_sessions_from_audit_events.sql`

- `public.device_bowl_sessions`
  - Guarda sesiones cerradas y consultables por app
  - Incluye `session_type`, `session_start_at`, `session_end_at`, `duration_seconds`
  - Incluye peso de referencia (`start_content_grams`, `end_content_grams`, `net_grams`)
  - Incluye calidad (`is_valid`, `validation_reason`)

- `public.device_bowl_session_anomalies`
  - Guarda inconsistencias de etiquetado:
    - `inicio_duplicado_reemplazado_por_inicio_mas_reciente`
    - `termino_sin_inicio_correspondiente`
    - `inicio_sin_termino_correspondiente`

- Funcion de reconstruccion:
  - `public.rebuild_device_bowl_sessions(p_device_uuid uuid default null, p_device_code text default null)`
  - Reconstruye sesiones/anomalias desde `audit_events`.

- Endpoint app:
  - `GET /api/devices/[id]/sessions`
  - Filtros: `type`, `from`, `to`, `limit`

## Regla de gramos netos

- `alimentacion` y `hidratacion`: `net_grams = max(0, start_content - end_content)`
- `servido`: `net_grams = max(0, end_content - start_content)`

Prioridad de peso por evento:
1. `payload.snapshot.content_weight_grams`
2. `payload.snapshot.weight_grams - plate_weight`
3. Fallback a lectura mas cercana en `public.readings` (ventana 20 min)

## Consulta KPCL0034 (ejemplo)

```sql
select
  session_type,
  session_start_at,
  session_end_at,
  duration_seconds,
  net_grams,
  is_valid,
  validation_reason
from public.device_bowl_sessions
where device_code = 'KPCL0034'
order by session_start_at desc;
```

## Resumen diario auditado (KPCL0034)

```sql
select
  session_type,
  count(*) as closed_cycles,
  sum(case when is_valid then 1 else 0 end) as valid_cycles,
  coalesce(sum(net_grams), 0) as net_grams_total
from public.device_bowl_sessions
where device_code = 'KPCL0034'
  and session_start_at >= date_trunc('day', timezone('America/Santiago', now())) at time zone 'America/Santiago'
group by session_type
order by session_type;
```
