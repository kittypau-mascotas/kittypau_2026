# Playbook de Ingreso - Trabajo IoT/Firmware/Microcontroladores

## Objetivo
Asegurar que el trabajo externo (firmware, ESP32/NodeMCU, bridge y microcontroladores) ingrese a KittyPaw sin romper el contrato de datos ni la operacion.

## Alcance
- Firmware (publicacion MQTT y comandos).
- Bridge (`bridge/src/index.js`).
- API ingest (`/api/mqtt/webhook`, `/api/bridge/heartbeat`, `/api/bridge/health-check`).
- SQL relacionado a telemetria/estado (`bridge_heartbeats`, `bridge_telemetry`, `devices`, `readings`).

## Ramas y flujo git
1. Base de integracion: `integration/iot-firmware-javier`.
2. Javier trabaja en ramas `feat/javier-iot/<modulo>`.
3. Cada entrega entra via PR a `integration/iot-firmware-javier`.
4. Solo despues de pasar todas las validaciones se hace PR de `integration/iot-firmware-javier` a `main`.

## Contrato tecnico obligatorio (Gate 1)
Debe respetarse sin excepcion:
- Topic sensores: `+/SENSORS` o patron acordado y documentado.
- Identificador valido: `device_id` formato `KPCL0000`.
- Webhook: header `x-webhook-token` valido.
- Rango payload:
  - `temperature`: -10..60
  - `humidity`: 0..100
  - `battery_level`: 0..100
  - `weight_grams`: 0..20000
  - `water_ml`: 0..5000
  - `flow_rate`: 0..1000
- Idempotencia: no duplicar `readings` para mismo `device_id + recorded_at`.

Referencia:
- `Docs/TOPICOS_MQTT.md`
- `Docs/RASPBERRY_BRIDGE.md`
- `kittypau_app/src/app/api/mqtt/webhook/route.ts`

## Entregables minimos por PR (Gate 2)
Cada PR IoT/Firmware debe incluir:
1. Resumen tecnico de cambio (que cambia y por que).
2. Impacto de contrato (campos, topics, comandos).
3. Plan de rollback (como volver a estado previo).
4. Evidencia de pruebas:
   - MQTT publish/subscribe
   - webhook 200
   - registro en `readings`
   - heartbeat en `bridge_heartbeats`
5. Si hay cambios de schema: migracion SQL idempotente en `supabase/migrations`.

## Suite minima de validacion (Gate 3)
Ejecutar antes de aprobar merge:
1. DB/API:
   - `Docs/TEST_DB_API.ps1`
   - `Docs/TEST_ONBOARDING_BACKEND.ps1`
2. E2E:
   - checklist de `Docs/PRUEBAS_E2E.md`
3. Unicidad de bridge:
   - `Docs/SQL_CHECK_BRIDGE_UNIQUENESS.sql`
4. Health check:
   - `GET /api/bridge/health-check?stale_min=10&device_stale_min=10`

## Reglas de compatibilidad hacia atras (Gate 4)
- No romper claves actuales del payload sin adaptador en bridge.
- Si cambia naming en firmware (`temp` -> `temperature`, etc), bridge debe mapear ambos durante transicion.
- No cambiar formato `KPCL0000` ni reglas de validacion del webhook sin migracion coordinada.

## Criterio de rechazo automatico
Se rechaza PR si ocurre cualquiera:
- No hay `device_id` valido.
- Webhook responde 4xx/5xx en prueba de ingestion.
- Cambios de SQL sin migracion/versionado.
- Cambios que rompen `Docs/TOPICOS_MQTT.md` sin actualizar documentacion y pruebas.

## Aprobacion final para merge a main
Checklist final:
- [ ] Gate 1 contrato tecnico OK
- [ ] Gate 2 entregables PR OK
- [ ] Gate 3 suite minima OK
- [ ] Gate 4 backward compatibility OK
- [ ] Reviewer backend
- [ ] Reviewer IoT/firmware

## Comandos utiles (operacion)
```bash
# Ver ramas remotas
git fetch origin --prune
git branch -r

# Crear rama de integracion
git checkout -b integration/iot-firmware-javier origin/main

# Validar cambios por carpeta
git diff --name-only origin/main...HEAD -- bridge supabase kittypau_app/src/app/api
```

## Nota operativa
Mientras no exista rama remota de Javier, se prepara este flujo y se congela `main` para trabajo IoT en PR obligatorio.
