# Plan SQL Estructura - KViejos

## Principio
KViejos es event-driven:
- persiste eventos del hogar
- deriva alertas desde reglas
- mantiene trazabilidad con audit log

## Decisiones v1
1. Tabla `events` como fuente unica de verdad.
2. Tabla `alerts` como entidad derivada y operable (activa/cerrada).
3. `audit_events` como log inmutable de acciones/fallas.
4. RLS habilitado en tablas core; en MVP se opera mayormente con `service_role` y admin.

## Indices minimos
- `events (household_id, recorded_at desc)`
- `alerts (household_id, status, created_at desc)`
- `sensors (household_id, status)`
- `contacts unique (household_id) where is_primary = true`

## Retencion
- MVP: retener eventos 90 dias (operativo)
- Historico: export/archivado (fase posterior)
