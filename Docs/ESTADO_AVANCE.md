# Estado del Proyecto y Proximos Pasos (2026-02-07)

## Resumen de avance
- Proyecto Next.js en `kittypau_app/` (TypeScript + App Router) desplegado en Vercel.
- Endpoints API listos: `/api/pets`, `/api/devices`, `/api/readings`, `/api/mqtt/webhook`.
- Esquema SQL actualizado en `Docs/SQL_SCHEMA.sql` con:
  - `devices.pet_id` obligatorio
  - `flow_rate` en `readings`
  - nuevos estados en `pet_state`, `device_state`, `status`
  - trigger `update_device_from_reading`
- Pruebas E2E completas y documentadas en `Docs/PRUEBAS_E2E.md`.
- Documentacion de login parallax cerrada en `Docs/IMAGENES_LOGIN.md`.

## Lo que ya funciona
1. Webhook recibe datos y guarda en Supabase (produccion).
2. CRUD de `pets` y `devices` funcionando con Auth.
3. Lecturas (`readings`) consultables por `device_id`.
4. Trigger actualiza `devices.last_seen` y `battery_level`.

## Pendiente inmediato (implementacion)
1. Aplicar Design Tokens + componentes base (Button, Card, Input).
2. Conectar frontend con APIs reales (pets/devices/readings).
3. Realtime en dashboard (suscripcion a readings).
4. Pop-up de registro con progreso (Usuario -> Mascota -> Dispositivo).
5. Bridge en Raspberry como servicio 24/7 (systemd + auto-restart).

## Arquitectura de pruebas (E2E)
- Vercel API en produccion: OK
- Supabase guardando lecturas: OK
- Raspberry Bridge: pendiente de validar 24/7 (systemd)

## Pendiente de infraestructura
1. Validar servicio systemd del bridge.
2. Configurar alertas / watchdog en Raspberry.
3. Nota: Bridge 24/7 queda fuera del alcance actual.

## Implementado hoy
- SQL actualizado y aplicado.
- Validaciones backend en POST /api/pets y POST /api/devices.
- E2E validado (Auth -> Pets -> Devices -> Webhook -> Readings).
- UI base login/today implementada (skeleton + estilos).
- Documentacion del login parallax cerrada.

## Conectividad validada (sin Bridge 24/7)
- [x] Docs ↔ Backend (SQL + APIs + errores consistentes).
- [x] Backend ↔ Supabase (constraints + schema cache + RLS smoke test).
- [x] Backend ↔ Front (contratos documentados y pruebas OK).
- [x] Diseño ↔ Producto (lineamientos y componentes definidos).

## Riesgos conocidos
- Falta integrar datos reales en UI (login/today sin l?gica).
- Realtime no esta integrado aun en frontend.

## Verificaciones cerradas (operacion)
- [x] Schema cache refrescado en Supabase.
- [x] Variables de entorno validadas entre Vercel y Raspberry.
- [x] Smoke test RLS ejecutado (multiusuario, 2026-02-07). Accesos cruzados devuelven 404 (esperado por RLS).






