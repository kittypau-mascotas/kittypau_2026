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
2. Realtime en dashboard (suscripcion a readings).
3. Pop-up de registro con progreso (Usuario -> Mascota -> Dispositivo).
4. Bridge en Raspberry como servicio 24/7 (systemd + auto-restart).

## Arquitectura de pruebas (E2E)
- Vercel API en produccion: OK
- Supabase guardando lecturas: OK
- Raspberry Bridge: pendiente de validar 24/7 (systemd)

## Pendiente de infraestructura
1. Validar servicio systemd del bridge.
2. Configurar alertas / watchdog en Raspberry.
3. Nota: Bridge 24/7 queda fuera del alcance actual.

## Implementado hoy
- Vercel CLI: `vercel link --yes` ejecutado. Vinculado a `kittypaus-projects/kittypau_2026_hivemq` y descargadas envs (sobrescribe `.env.local` local).
- Onboarding backend test OK (2026-02-08): pet `55a0bb9e-2084-4131-9ef9-aaf5327bd08e`, device `e986136d-dd58-43d7-bafc-71406c1810a0` (KPCL0407).
- GET /api/onboarding/status OK (2026-02-08): userStep `pet_profile`, petCount `4`, deviceCount `6`.
- Archivo local de entorno de pruebas creado (Docs/.env.test.local, no versionado).
- Endpoint onboarding status (`GET /api/onboarding/status`) listo.
- Normalizacion de strings en PATCH /api/pets/:id.
- POST /api/devices ahora revierte si falla update de pet_state.
- Webhook validado con deviceId (UUID) y valores string normalizados.
- Test onboarding backend OK (profiles -> pets -> devices) via TEST_ONBOARDING_BACKEND.ps1.
- Test inmediato TEST_DB_API.ps1 ejecutado OK (Auth, Pets, Devices, Webhook, Readings).
- DB/API smoke test real con KPCL0300 (Auth, RLS, Devices, Webhook, Readings).
- Constraints de onboarding y device_code agregados en SQL.
- SQL actualizado y aplicado.
- Validaciones backend en POST /api/pets y POST /api/devices.
- E2E validado (Auth -> Pets -> Devices -> Webhook -> Readings).
- UI base login/today implementada (skeleton + estilos).
- Documentacion del login parallax cerrada.
- UI conectada a datos reales (login Supabase + feed con pets/devices/readings).
- UI validada con datos reales (Mishu + KPCL0200).
- Onboarding API ampliada (profiles PUT campos, pets POST/patch steps, devices POST actualiza pet_state).

## Conectividad validada (sin Bridge 24/7)
- [x] Docs ↔ Backend (SQL + APIs + errores consistentes).
- [x] Backend ↔ Supabase (constraints + schema cache + RLS smoke test).
- [x] Backend ↔ Front (contratos documentados y pruebas OK).
- [x] Diseño ↔ Producto (lineamientos y componentes definidos).

## Riesgos conocidos
- Realtime no esta integrado aun en frontend.

## Verificaciones cerradas (operacion)
- [x] Schema cache refrescado en Supabase.
- [x] Constraints de onboarding aplicadas (2026-02-07).
- [x] Variables de entorno validadas entre Vercel y Raspberry.
- [x] Smoke test RLS ejecutado (multiusuario, 2026-02-07). Accesos cruzados devuelven 404 (esperado por RLS).












