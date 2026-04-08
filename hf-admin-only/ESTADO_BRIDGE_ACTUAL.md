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

## Decision vigente
1. El bridge activo del proyecto es `bridge/src/index.js` (v2.4, MQTT→Supabase directo).
2. `bridge_v2_4/` fue eliminado — su código fue consolidado en `bridge/src/index.js`.
3. Cualquier migración de bridge debe pasar por PR, checklist y plan de rollback.

## Validaciones minimas
- `POST /api/mqtt/webhook` responde 200 en prueba controlada.
- `POST /api/bridge/heartbeat` responde 200.
- Dashboard admin refleja estado de bridge sin degradacion inesperada.

