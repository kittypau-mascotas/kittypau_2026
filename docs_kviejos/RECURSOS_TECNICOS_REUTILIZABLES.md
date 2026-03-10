# Recursos Tecnicos Reutilizables (desde Kittypau)

## Plataforma base disponible hoy
En este repo ya existen componentes reutilizables:
- Next.js App Router con layout, flavors (web vs native APK) y UI base.
- Supabase server client (service role) y user client (bearer) para APIs.
- Bridge: heartbeat, telemetria, estado y lectura de sensores (sensor_readings).
- Admin: roles (`admin_roles`), endpoints admin y dashboard.
- Auditoria: tabla `audit_events` y uso real en endpoints (demo ingress, admin tests).

## Que se puede reusar "tal cual" para KViejos
- Patron de "devices + readings" como "sensors + events"
- Patron de bridge healthcheck/heartbeat
- Patron de admin-only endpoints con fallback por email
- Patron de "bandeja" deduplicada (como `demo_ingresos`) para alertas o leads

## Cambios necesarios (KViejos)
- Entidades: hogar, residente, contactos, reglas de alerta
- Eventos: movimiento/puerta/gas/agua/medicacion
- Canal TV: especificar mecanismo (Android TV app / Chromecast / box)

