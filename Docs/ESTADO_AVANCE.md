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
- UI onboarding reforzado: validaciones, gating, tooltips y resumen de progreso.
- UI today: selector de device, refresco con timestamp y badge de frescura.
- UI story: timeline narrativo básico con selector de dispositivo.
- UI pet: perfil conductual básico con insights y selector de mascota.
- UI bowl: estado técnico del plato con batería y última conexión.
- UI settings: ajustes de perfil y notificaciones.
- UI register: ruta pública con reenvío de confirmación.
- Realtime integrado en /today y /story (lecturas en vivo).
- Realtime integrado en /pet (lecturas en vivo).
- Estados vacíos/errores unificados en story, pet, bowl y settings.
- Login/register: validación básica + recuperación de contraseña + banner de verificación.
- /today refinado: resumen interpretado y acceso a /story.
- Tests DB/API + onboarding backend ejecutados OK (2026-02-08).
- Navegación global añadida para vistas app (today/story/pet/bowl/settings).
- Fix auth errors undefined en endpoints (devices/pets/profiles/onboarding/readings).
- Signup redirect configurado en frontend (emailRedirectTo) pendiente SMTP en Supabase.
- Observabilidad minima: logs estructurados con `request_id` + `duration_ms` en endpoints API.
- Webhook hardening: si se envían `deviceId` y `deviceCode`, deben coincidir.
- Clock drift: cálculo usa `serverTimeMs` consistente y registra `delta_ms`.
- Trigger de devices optimizado: actualiza `last_seen` solo si pasó 1 min.
- Índice cubriente para readings (device_id, recorded_at) con INCLUDE de métricas.
- Algoritmos de interpretación documentados (baseline, ventanas, guardrails).
- Health check del bridge documentado (heartbeat + cron + alertas).
- Plan de particionado de `readings` documentado (Postgres nativo + Timescale).
- Endpoints bridge/heartbeat y bridge/health-check implementados.
- Onboarding UI en una sola vista con pasos guiados y validaciones de perfil.
- Popup de registro implementado desde /login con flujo account + onboarding.
- Backend hardening v1 completo (errores, rate limit, validaciones, auditoria, RPC, indices, cleanup).
- Reglas de negocio aplicadas: `pet_state` default `device_pending`, `type` no editable, `care_rating` 1-10.
- Un solo device activo por mascota (indice parcial) y link setea `device_state = linked`.
- Migracion SQL aplicada via Supabase CLI (cleanup + indice unico active per pet).
- Tests locales OK (2026-02-08): TEST_DB_API.ps1 + TEST_ONBOARDING_BACKEND.ps1.
- Rate limit distribuido (Upstash) con fallback local.
- Validacion Upstash OK (429 esperado al exceder 60 req/min en webhook).
- Webhook con doble timestamp (recorded_at + ingested_at) y flag clock_invalid.
- Webhook idempotente por `device_id + recorded_at`.
- Paginacion en GET /api/pets, /api/devices, /api/readings.
- Logs server-side con `request_id` (errores + webhook success).
- Documentacion CLI completada (Vercel, Supabase, HiveMQ, Raspberry) con ejemplos.
- Tests post-migracion OK (2026-02-08): DB/API KPCL0159 + onboarding KPCL0208.
- UTF-8 corregido en UI (login + today).
- Onboarding UI basico implementado (perfil + mascota + dispositivo).
- Onboarding UI ajustado: user_step -> pet_profile al guardar perfil; pet_state usa default device_pending.
- Tipografia actualizada: Titan One (marca), Fraunces (titulos), Inter (texto).
- Prueba end-to-end Raspberry/HiveMQ documentada (simulada con MQTT CLI).
- Docs MQTT alineados a topics `+/SENSORS` (arquitectura y Raspberry CLI).
- GET /api/devices sin rate limit (solo POST).
- GET /api/pets sin rate limit; POST /api/pets con rate limit.
- GET /api/profiles corregido (sin audit ni rate limit); PUT /api/profiles con rate limit + audit.
- Errores API estandarizados con `code` y `request_id`.
- Rate limiting basico aplicado (webhook y endpoints mutables).
- Limites de payload y rangos validados (weight_kg, battery_level, readings limit).
- Auditoria basica agregada (tabla `audit_events` + inserciones).
- RPC `link_device_to_pet` agregado para alta atomica de device + pet_state.
- Indices compuestos agregados para consultas frecuentes (pets/devices/readings).
- Script de cleanup/backfill agregado (`Docs/CLEANUP_SQL.sql`).
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
- Refresh token no implementado en UI (pendiente siguiente iteracion).

## Verificaciones cerradas (operacion)
- [x] Schema cache refrescado en Supabase.
- [x] Constraints de onboarding aplicadas (2026-02-07).
- [x] Variables de entorno validadas entre Vercel y Raspberry.
- [x] Smoke test RLS ejecutado (multiusuario, 2026-02-07). Accesos cruzados devuelven 404 (esperado por RLS).














## Resumen por módulo
- UI: onboarding guiado con validaciones, tooltips visuales, popup de registro y mejoras en today (selector device + refresh + frescura).
- API: endpoints estandarizados con request_id, rate limit distribuido, idempotencia en webhook, bridge healthcheck y onboarding status.
- DB: SQL con helpers idempotentes, índices clave y ajustes de lecturas (ingested_at, clock_invalid).
- Infra: Vercel + Supabase CLI documentados, Upstash Redis integrado.
- Tests: scripts DB/API y onboarding backend, checklist Postman/Newman.


## Pendientes prioritarios
- Front: implementar `/pet`, `/bowl`, `/settings` y ruta `/register` (además del popup).
- Front: integrar Realtime en `/today` y `/story`.
- Auth: resolver envío de confirmaciones (SMTP o desactivar confirmación).


