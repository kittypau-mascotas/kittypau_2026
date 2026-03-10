# Modelo de Datos (Fase 2) — KViejos

## Principio
KViejos es event-driven: guardamos eventos y derivamos alertas.

## Entidades propuestas
- households: hogar/instalacion
- residents: adulto mayor (beneficiario)
- contacts: familiares/cuidadores y canales
- sensors: dispositivos (motion, door, gas, water, sos)
- events: hechos del mundo (timestamp, tipo, severidad, payload)
- alert_rules: reglas configurables (horarios, umbrales, ventanas)
- alerts: instancias activas/cerradas
- acknowledgements: confirmaciones ("visto", "resuelto")
- audit_events: log inmutable de acciones y fallas

## Mapeo con Kittypau
- sensors ~ devices
- events ~ readings (pero mas semantico)
- alerts ~ admin events + notificaciones

## Campos minimos (events)
- id (uuid)
- household_id
- sensor_id
- event_type (motion/gas/water/door/medication/sos)
- severity (info/warn/critical)
- recorded_at
- payload (jsonb)

