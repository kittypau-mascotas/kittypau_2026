# Notas de Sesion (2026-02-15)

## UI / Auth
- Flujo de registro y onboarding unificado en popup dentro de `/login`.
- Stepper 4 pasos: Cuenta -> Usuario -> Mascota -> Dispositivo.
- Al confirmar correo, el usuario vuelve al popup y continua automaticamente en Paso 2.
- Variantes de confirmacion soportadas:
  - `/login?register=1&code=...` (PKCE)
  - `/login?register=1&type=signup&token_hash=...` (OTP/hash)
  - `/login?register=1&verified=1` (abre popup; al existir sesion, avanza)

## Operacion / Admin
- Dashboard admin `/admin` muestra resumen (KPCL online/offline, bridge status) y audit events en linea.
- Health-check genera eventos en `audit_events` para offline y outage general.

## Bridge (pendiente)
- Integracion directa con Raspberry Bridge pendiente (evitar dependencia de tokens manuales).
- Mantener pruebas SQL de unicidad en `Docs/SQL_CHECK_BRIDGE_UNIQUENESS.sql`.

## Pendientes proximos
- Verificar link de confirmacion real de Supabase (parametros exactos) y endurecer el manejo de errores en popup.
- Ajustar `device_stale_min` a valores operativos reales y excluir KPCL retirados.
- Rotar `BRIDGE_HEARTBEAT_SECRET` expuesto en consola.
- Revisar ejecucion local del frontend (scripts npm / ruta correcta de `package.json`).
