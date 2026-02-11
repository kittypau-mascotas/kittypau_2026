# Plan de Mejora DB (Supabase) sin romper front

## Objetivo
Mejorar rendimiento y estabilidad de telemetria manteniendo el esquema actual y compatibilidad con el frontend.

## Principios
- No romper endpoints existentes.
- Mantener `readings` como tabla de app.
- Ingesta sigue entrando por `sensor_readings`.
- Optimizar consultas con indices y vistas/materializaciones seguras.

## Diagnostico (hoy)
- `sensor_readings` es telemetria cruda (device_id KPCL, append-only).
- `readings` es la tabla que consume la app (device_id UUID, con ingested_at/clock_invalid).
- Ya existe pipeline de sync: `sensor_readings` -> `readings` (via trigger).

## Plan propuesto (incremental y seguro)

### Fase 1: Consolidar pipeline actual
1. Asegurar que `readings` tenga todos los campos necesarios (light_lux, light_percent, light_condition, device_timestamp).
2. Mantener trigger `trg_sync_sensor_reading` (no tocar el bridge).
3. Backfill historico idempotente cuando sea necesario.
4. Agregar indices de lectura:
   - `readings (device_id, recorded_at desc)`
   - `sensor_readings (device_id, recorded_at desc)`

### Fase 2: Capa de lectura rapida (sin romper API)
1. Crear vista o tabla agregada (1min o 5min) y usarla solo en la UI donde se requiera (opcional).
2. Mantener endpoints actuales y agregar nuevos endpoints agregados.

### Fase 3: Retencion y limpieza
1. Retencion en `sensor_readings` (p.ej. 30-90 dias) con job semanal.
2. Mantener `readings` como tabla reducida para UI (solo ultimos N dias si aplica).

## Cambios SQL sugeridos (fase 1)
- Agregar columnas faltantes en `readings`.
- Indices recomendados.
- Verificacion de integridad.

## Riesgos
- Cualquier cambio en columnas debe ser compatible con el frontend.
- No tocar FK ni nombres de columnas usadas por el front.

## Checklist de verificacion
- Insert en `sensor_readings` crea row en `readings`.
- Queries en `/api/readings` siguen funcionando.
- UI carga lecturas en /today y /story.

