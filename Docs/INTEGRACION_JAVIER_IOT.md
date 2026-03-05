# Integracion Javier IoT (kittypau_1a)

## Fuente
- Repo origen: `https://github.com/javo-mauro/kittypau_1a`
- Commit referencia: `4929cca`
- Fecha de integracion local: `2026-03-02`

## Contenido integrado en este repo
Ruta base integrada:
- `iot_firmware/javier_1a/`

Elementos importados:
- `firmware-esp32cam/`
- `firmware-esp8266/`
- `bridge_v2_4/bridge.js`
- `bridge_v2_4/package.json`
- `bridge_v2_4/supabase_schema.sql`
- `Topicos_javier.md`
- `MANUAL_USUARIO_javier.md`
- `Hitos-Pendientes_javier.md`

## Criterio de integracion aplicado
Se hizo **fusion por contenido** (no merge de historias git) para evitar conflictos estructurales entre repos:
- este repo usa `kittypau_app/`, `bridge/` y API webhook en Next.js.
- el repo de Javier trae estructura distinta (`kittypau-app/` + bridge directo a Supabase).

## Restricciones antes de promover a produccion
1. No reemplazar `bridge/src/index.js` actual sin validar contrato `/api/mqtt/webhook` y `/api/bridge/heartbeat`.
2. No aplicar `supabase_schema.sql` de Javier directo en prod sin convertirlo a migracion idempotente en `supabase/migrations`.
3. Validar payload MQTT y reglas de `device_id` con:
   - `Docs/TOPICOS_MQTT.md`
   - `Docs/SQL_CHECK_BRIDGE_UNIQUENESS.sql`
   - `Docs/PRUEBAS_E2E.md`

## Siguiente paso recomendado
Crear PR tecnico para revisar diferencias entre:
- `iot_firmware/javier_1a/bridge_v2_4/bridge.js`
- `bridge/src/index.js`
y decidir una unificacion de bridge en una sola implementacion.
