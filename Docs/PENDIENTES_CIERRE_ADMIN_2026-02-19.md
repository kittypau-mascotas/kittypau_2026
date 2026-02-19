# Pendientes de Cierre (Admin / Finanzas)

## Cerrado en código
- Catálogo KPCL desacoplado de la UI:
  - Se creó catálogo compartido en `kittypau_app/src/lib/finance/kpcl-catalog.ts`.
  - `admin/page.tsx` ahora consume `kpcl_catalog` desde backend (con fallback local seguro).
- Backend admin actualizado:
  - `GET /api/admin/overview` ahora incluye `kpcl_catalog` construido desde DB.
  - Nuevo endpoint: `GET /api/admin/finance/kpcl-catalog`.
  - Nuevo endpoint: `POST/GET /api/admin/tests/run-all` (suite + historial de errores).
- Base de datos:
  - Migración `supabase/migrations/20260220001500_finance_kpcl_catalog.sql`.
  - Tablas nuevas:
    - `public.finance_kpcl_profiles`
    - `public.finance_kpcl_profile_components`
  - Seed inicial para perfiles `nodemcu-v3`, `esp32-cam`, `generic-kpcl`.
- Resiliencia de métricas de tablas/vistas:
  - Fallback en API Admin: si falla `admin_object_stats_live`, usa RPC `admin_object_stats()`.
  - Migración de hardening `supabase/migrations/20260220003000_admin_object_stats_hardened.sql`.
- Operación QA Admin:
  - Botón en UI para correr suite completa de tests.
  - Historial de errores persistido en `audit_events`.

## Pendiente bloqueante (externo)
1. Rotación de secretos
- `SUPABASE_SERVICE_ROLE_KEY`
- `MQTT_PASSWORD`
- Tokens Vercel/OIDC expuestos en sesiones previas
- Credenciales de prueba locales

2. Costo real HiveMQ (hoy simulado)
- Crear API token de HiveMQ Cloud.
- Definir en Vercel:
  - `HIVEMQ_API_BASE_URL`
  - `HIVEMQ_API_TOKEN`
  - `HIVEMQ_CLUSTER_ID`
- Reemplazar shadow-pricing por métricas reales de plan/uso.

## Checklist de release
- [ ] Ejecutar migración nueva en Supabase (`db push`).
- [ ] Deploy de app con nuevas rutas.
- [ ] Verificar en Admin:
  - `kpcl_catalog` llega en `/api/admin/overview`.
  - Tabla de costos por KPCL renderiza desde catálogo backend.
  - Endpoint `/api/admin/finance/kpcl-catalog` responde 200.
- [ ] Rotación de secretos completa.
