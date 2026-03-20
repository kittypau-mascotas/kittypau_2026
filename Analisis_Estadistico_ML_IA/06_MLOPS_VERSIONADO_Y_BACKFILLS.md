# MLOps: versionado y backfills

## Versionado (mínimo)
- `payload_version` (bridge → webhook)
- `algorithm_version` (reglas/estadística)
- `model_version` (modelos ML)

## Re-ejecución segura
- Todo job batch debe ser idempotente (upsert) y re-runnable.
- Backfills documentados: rango, parámetros, versión y resultados esperados.

## Checklist por release
- Cambios en schema (`Docs/SQL_SCHEMA.sql` / migraciones)
- Cambios en features
- Cambios en umbrales/alertas
- Evidencia de evaluación (métricas)

