# Suite de Tests Admin

## Objetivo
Validar rapidamente que las fuentes criticas del dashboard admin esten operativas.

## Endpoint
- `POST /api/admin/tests/run-all`: ejecuta la suite completa.
- `GET /api/admin/tests/run-all`: obtiene historial reciente de ejecuciones con error.

## Tests incluidos
1. `admin_dashboard_live`
- Sirve para: validar el resumen operativo principal.
- Resultado esperado: consulta exitosa de la vista.

2. `bridge_status_live`
- Sirve para: confirmar estado en vivo de bridges.
- Resultado esperado: consulta exitosa y conteo de bridges.

3. `kpcl_devices`
- Sirve para: verificar inventario KPCL activo.
- Resultado esperado: conteo de dispositivos KPCL.

4. `finance_summary`
- Sirve para: validar resumen financiero consolidado.
- Resultado esperado: fila disponible en `finance_admin_summary`.

5. `kpcl_catalog`
- Sirve para: comprobar perfiles/componentes de costos KPCL.
- Resultado esperado: perfiles activos y componentes disponibles.

6. `db_object_stats`
- Sirve para: validar catalogo de tablas/vistas del admin.
- Resultado esperado: datos por `admin_object_stats_live` o fallback RPC `admin_object_stats()`.

## Respuesta de ejecucion (POST)
- `status`: `passed` o `failed`.
- `failed_count`: cantidad de tests con error.
- `total_count`: cantidad total de tests ejecutados.
- `results[]`: detalle por test:
  - `id`, `name`, `status`, `duration_ms`, `details`.

## Historial de errores
- Solo las ejecuciones con error se guardan en `audit_events`.
  - `event_type`: `admin_test_suite_failed`.
  - `payload`: status, conteos y detalle de resultados.
- El dashboard muestra este historial en la seccion **Suite de Tests Admin**.
