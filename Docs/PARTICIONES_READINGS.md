# Particionado de Readings (Plan)

## Objetivo
Evitar degradación de performance al crecer el volumen de lecturas.

## Enfoque recomendado (Postgres nativo)
Particionar `public.readings` por rango de fecha mensual sobre `recorded_at`.

## Estrategia
1. Convertir `readings` en tabla particionada (RANGE).
2. Crear particiones mensuales (p.ej. `readings_2026_02`).
3. Crear índices por partición (device_id, recorded_at desc).
4. Crear función/cron para auto‑crear la próxima partición.

## SQL base (esqueleto)
```sql
-- 1) Convertir a particionada (requiere ventana de mantenimiento)
ALTER TABLE public.readings
  PARTITION BY RANGE (recorded_at);

-- 2) Particiones mensuales
CREATE TABLE IF NOT EXISTS public.readings_2026_02
  PARTITION OF public.readings
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- 3) Índices por partición (ejemplo)
CREATE INDEX IF NOT EXISTS idx_readings_2026_02_device_recorded
  ON public.readings_2026_02 (device_id, recorded_at desc);
```

## Consideraciones
- `recorded_at` debe existir y ser consistente (si `clock_invalid`, usar `ingested_at` como fallback).
- Si se decide usar `ingested_at` como partición, actualizar queries/índices.
- Para backfill: mover datos existentes a particiones por rango.

## Alternativa (TimescaleDB)
Si está disponible en Supabase, usar hypertable:
```sql
select create_hypertable('public.readings', 'recorded_at');
```

## Operación
- Crear partición de “mes próximo” el día 25 de cada mes.
- Alertar si no existe partición para el mes actual.

## Validación
- `EXPLAIN` debe mostrar “Partition Pruning”.
- Queries `/api/readings` deben usar índice por partición.
