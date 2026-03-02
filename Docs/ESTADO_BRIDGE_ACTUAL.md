# Estado Actual del Bridge (Kittypau)

Fecha de corte: 2026-03-02.

## Bridge productivo activo
- Ruta: `bridge/src/index.js`
- Ejecucion local:
```bash
cd bridge
npm start
```
- Variables esperadas: `bridge/.env` (segun `bridge/.env.example`)

## Bridge de referencia (Javier)
- Ruta: `iot_firmware/javier_1a/bridge_v2_4/bridge.js`
- Estado: referencia tecnica, no productivo principal.

## Decision vigente
1. El bridge activo del proyecto es `bridge/src/index.js`.
2. `bridge_v2_4` se usa para analisis y convergencia controlada.
3. Cualquier migracion de bridge debe pasar por PR, checklist y plan de rollback.

## Validaciones minimas
- `POST /api/mqtt/webhook` responde 200 en prueba controlada.
- `POST /api/bridge/heartbeat` responde 200.
- Dashboard admin refleja estado de bridge sin degradacion inesperada.

