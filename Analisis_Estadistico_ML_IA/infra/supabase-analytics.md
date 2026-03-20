# Supabase Analytics (DB separada)

En este repo, `supabase-analytics/` es un proyecto Supabase **independiente** del main.

Referencia ID (project ref) detectado por CLI: `spfonxnyprjqxcxaqsbe` (URL: `https://spfonxnyprjqxcxaqsbe.supabase.co`).

## Propósito
Guardar **data procesada** (no raw):
- `public.pet_sessions`: una fila por sesión (comida/agua)
- `public.pet_daily_summary`: resumen diario por mascota

La migración base está en:
- `supabase-analytics/migrations/20260317000000_analytics_init.sql`

La configuración del proyecto (Supabase CLI) está en:
- `supabase-analytics/config.toml`

Snapshot autocontenido (copia de referencia) en:
- `Analisis_Estadistico_ML_IA/infra/supabase-analytics/`

## Cómo se integra con el análisis
- Fuente para gráficos/insights agregados (tendencias, rutinas, anomalías a nivel sesión/día).
- El aislamiento multi-tenant ocurre por `owner_id` (la API/worker debe filtrar por `owner_id`).

## Operación (Supabase CLI)
Guía de uso (resumen):
1. `cd supabase-analytics`
2. `npx supabase link --project-ref spfonxnyprjqxcxaqsbe` (te pedirá password de Postgres)
3. `supabase db push`

## Notas de coherencia (importante)
- En la DB de analytics, `device_id` es el código humano (TEXT, KPCL). En la DB main, `readings.device_id` es UUID FK a `devices.id`.
- Para análisis longitudinal, usar llaves estables: `owner_id` + `pet_id` + ventana temporal.
