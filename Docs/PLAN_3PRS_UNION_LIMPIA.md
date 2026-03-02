# Plan Ejecutable - Union Limpia Mauro/Javo (3 PRs)

## Objetivo
Ejecutar una integracion limpia y controlada de trabajo colaborativo entre Mauro y Javo, reduciendo riesgo tecnico y operativo.

## Estado actual
- Rama comun de integracion: `main`.
- Ramas personales:
  - `feat/mauro-curcuma`
  - `feat/javo-mauro`
- Guardrails creados en repo:
  - `.github/CODEOWNERS`
  - `.github/pull_request_template.md`
  - `.github/workflows/pr-quality.yml`
  - `.github/workflows/monthly-fusion-review.yml`
- Registros:
  - `Docs/AVANCE_PUSHES_GITHUB.md`
  - `Docs/GITHUB_MAURO.md`
  - `Docs/GITHUB_JAVO.md`

## Paso 0 (manual en GitHub UI) - Proteccion de `main`
Configurar branch rule en GitHub para `main`:
1. Require PR before merging.
2. Require at least 1 approval (ideal 2).
3. Require review from CODEOWNERS.
4. Require status checks: `App Lint + Build`, `Repo Policy Checks`.
5. Block direct push to `main`.
6. Include administrators.

Sin este paso, no iniciar los PRs tecnicos.

## PR 1 - Infra de colaboracion (primero)
Titulo sugerido:
- `chore(github): enforce collaboration guardrails and governance docs`

Incluye:
- `.github/*` (CODEOWNERS, PR template, workflows)
- Docs de flujo/gobernanza/onboarding/bitacoras/registro de pushes
- Ajuste `.gitignore` para excluir carpetas locales de referencia

Validaciones:
1. Workflow `PR Quality` en verde.
2. Revisión de Mauro + Javo.
3. Confirmar que no se incluyeron archivos locales ni secretos.

Merge:
- A `main`, via PR.

## PR 2 - IoT/Firmware (segundo)
Titulo sugerido:
- `feat(iot): integrate javier firmware baseline under iot_firmware`

Incluye:
- `iot_firmware/javier_1a/**`
- docs asociadas de integración IoT

Validaciones:
1. Verificar estructura de firmware (`platformio.ini` en ESP32/ESP8266).
2. Revisar contratos MQTT y bridge docs.
3. Actualizar `AVANCE_PUSHES_GITHUB` y bitácoras.

Merge:
- A `main`, via PR.

## PR 3 - Bridge/App (tercero)
Titulo sugerido:
- `feat(admin+iot): add javo admin module and align bridge strategy`

Incluye:
- cambios UI/admin relacionados a módulo Javo
- ajustes bridge/app acordados tras revisión

Validaciones:
1. `npm run lint` y `npm run build` en `kittypau_app`.
2. Revisión de impacto en `/api/mqtt/webhook` y `/api/bridge/heartbeat`.
3. Pruebas de humo en admin y app.

Merge:
- A `main`, via PR.

## Estrategia de bridge (decision explicita)
Decision actual:
1. Mantener `bridge/src/index.js` como bridge productivo actual.
2. Usar `iot_firmware/javier_1a/bridge_v2_4/bridge.js` como referencia técnica.
3. Cualquier convergencia a v2_4 se hace en rama dedicada:
   - `integration/bridge-convergence`
4. Solo migrar a productivo tras:
   - validación de contrato API,
   - pruebas E2E mínimas,
   - plan de rollback probado.

## Rollback operativo (obligatorio)
Responsables:
- Revert PR: Mauro (owner repo)
- Verificación IoT/bridge post-revert: Javo
- Redeploy Vercel: Mauro

Secuencia:
1. Revertir PR en GitHub (o `git revert` en rama de hotfix).
2. Merge del revert a `main`.
3. Redeploy Vercel (preview/prod según impacto).
4. Verificar:
   - `/api/mqtt/webhook` responde 200 en prueba controlada
   - `/api/bridge/heartbeat` responde 200
   - `/today` y `/admin` cargan
5. Registrar incidente en:
   - `Docs/AVANCE_PUSHES_GITHUB.md`
   - bitácora del responsable

## Validacion minima pre-merge (checklist)
- [ ] `npm run lint` en `kittypau_app`
- [ ] `npm run build` en `kittypau_app`
- [ ] `Docs/AVANCE_PUSHES_GITHUB.md` actualizado
- [ ] `Docs/GITHUB_MAURO.md` o `Docs/GITHUB_JAVO.md` actualizado
- [ ] revisión de `Docs/SQL_CHECK_BRIDGE_UNIQUENESS.sql`
- [ ] revisión de `Docs/PRUEBAS_E2E.md` (casos relevantes al cambio)

## Nota operativa
`origin` es remoto, no rama.
Rama común siempre: `main`.
