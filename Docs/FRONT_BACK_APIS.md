# Frontend, Backend y APIs (MVP Kittypau)

## Decisión técnica
- **Frontend**: Next.js (App Router) en Vercel.
- **Backend**: API Routes de Next.js (sin servicio extra para mantener $0).
- **DB/Auth/Realtime**: Supabase.
- **MQTT**: HiveMQ Cloud -> webhook a `/api/mqtt/webhook`.
- **Bridge**: Raspberry Pi Zero 2 W (porque HiveMQ Free no ofrece webhooks).

## Que se despliega en Vercel
En este proyecto, **el deploy en Vercel incluye todo**:
1. **Frontend** (UI web).
2. **API** (`/api/*`), incluyendo el webhook de HiveMQ.
3. **Backend ligero** (lógica serverless dentro de esas rutas).

No hay backend separado en otro servidor. La base de datos vive en Supabase.

## Objetivo funcional
1. Registro e inicio de sesión.
2. Crear mascota.
3. Registrar dispositivo (plato comida/agua) con QR.
4. Ver datos en vivo (streaming) en la app.

## Registro en pop-up
- Se abre al click de registrarse (web y movil).
- Barra de progreso con 4 hitos: Cuenta -> Usuario -> Mascota -> Dispositivo.
- Persistencia si el usuario cierra.
- Confirmacion por correo: al validar, el flujo vuelve al pop-up y continua en Paso 2 (Usuario).

### Confirmacion de cuenta (Supabase)
- Redirect configurado en `signUp`:
  - `/login?register=1&verified=1`
- Variantes soportadas al volver desde el correo:
  - PKCE: `/login?register=1&code=...` -> `exchangeCodeForSession(code)`
  - OTP/hash: `/login?register=1&type=signup&token_hash=...` -> `verifyOtp({ type, token_hash })`
  - Simple: `/login?register=1&verified=1` (abre el pop-up; al existir sesion, avanza a Paso 2)

## Estructura del frontend
```
src/app/
  (public)/
    login/
    register/
  (protected)/
    dashboard/
    pets/
    devices/
  api/
    mqtt/webhook/
    pets/
    devices/
    readings/
```

## Endpoints mínimos (API Routes)
1. `POST /api/mqtt/webhook`
   - Recibe datos desde HiveMQ.
   - Valida `x-webhook-token`.
   - Inserta lectura y actualiza `devices`.
   - Busca el dispositivo por `device_id`.
   - Idempotente por `device_id + recorded_at` (si llega duplicado, responde `idempotent: true`).

2. `GET/PUT /api/profiles`
   - Lee/actualiza perfil del usuario.
   - Campos soportados: `auth_provider`, `user_name`, `is_owner`, `owner_name`,
     `care_rating`, `phone_number`, `notification_channel`, `city`, `country`,
     `photo_url`, `user_onboarding_step`.

3. `GET/POST /api/pets`
   - Lista mascotas del usuario.
   - Crea nueva mascota.
   - Campos extra: `pet_state`, `pet_onboarding_step`.
   - Paginacion opcional: `?limit=20&cursor=2026-02-08T00:00:00Z`.
     - Si hay `limit` o `cursor`, respuesta: `{ data, next_cursor }`.

4. `PATCH /api/pets/:id`
   - Actualiza datos de mascota.
   - Requiere `Authorization: Bearer <access_token>`.

5. `GET/POST /api/devices`
   - Lista dispositivos.
   - Registra y asigna dispositivo a mascota.
   - `device_id` se obtiene del QR del plato.
   - Al crear dispositivo, actualiza `pet_state` a `device_linked`.
   - Internamente usa RPC `link_device_to_pet` (operacion atomica).
   - Paginacion opcional: `?limit=20&cursor=2026-02-08T00:00:00Z`.
     - Si hay `limit` o `cursor`, respuesta: `{ data, next_cursor }`.

6. `GET /api/readings?device_uuid=...`
   - Lecturas recientes para gráficos.
   - Paginacion opcional: `&limit=50&cursor=2026-02-08T00:00:00Z`.
     - Si hay `limit` o `cursor`, respuesta: `{ data, next_cursor }`.

7. `GET /api/onboarding/status`
   - Resumen de onboarding para UI.
   - Retorna: `userStep`, `hasPet`, `hasDevice`, `petCount`, `deviceCount`.

8. `PATCH /api/devices/:id`
   - Actualiza estado del dispositivo o re-vincula mascota.
   - Requiere `Authorization: Bearer <access_token>`.

9. `POST /api/bridge/heartbeat`
   - Heartbeat del bridge (server-only).
   - Requiere `x-bridge-token`.

10. `GET /api/bridge/health-check`
   - Health check del bridge para cron (server-only).
   - Requiere `x-bridge-token`.

11. `GET /api/admin/overview`
   - Dashboard admin (server-only).
   - Requiere `Authorization: Bearer <access_token>`.
   - Verifica rol en `admin_roles`.
   - Retorna resumen ejecutivo/operativo + feed de `audit_events` en línea.

12. `POST /api/admin/health-check`
   - Ejecuta health-check de bridge/KPCL bajo autorizacion admin (server-only).
   - Requiere `Authorization: Bearer <access_token>`.
   - Internamente llama `GET /api/bridge/health-check` usando `BRIDGE_HEARTBEAT_SECRET`.
   - Registra auditoria: `admin_health_check_run`.
   - Query params:
     - `stale_min` (bridge)
     - `device_stale_min` (KPCL)

Payload propuesto:
```json
{
  "status": "maintenance",
  "device_state": "offline",
  "device_type": "food_bowl",
  "pet_id": "uuid-opcional"
}
```

## Autenticacion para CRUD
Los endpoints `/api/profiles`, `/api/pets`, `/api/devices` y `/api/readings` requieren:
```
Authorization: Bearer <access_token>
```

### Refresh de sesión (frontend)
- El frontend guarda `access_token` y `refresh_token` en `localStorage`.
- Antes de llamar APIs, el frontend intenta obtener un token vÃ¡lido:
  - Si el `access_token` estÃ¡ por expirar, se renueva usando `refresh_token`.
  - Si una llamada API vuelve `401`, se reintenta 1 vez tras refrescar.
- Helpers:
  - `src/lib/auth/token.ts` (`getValidAccessToken`, `forceRefreshAccessToken`)
  - `src/lib/auth/auth-fetch.ts` (`authFetch`)

### Nota (CORS / "Failed to fetch")
- Los endpoints bajo `/api/*` soportan preflight `OPTIONS` y retornan headers CORS.
- Esto permite usar herramientas externas u orÃ­genes distintos (p.ej. pruebas en otro PC/local) con `Authorization` o `x-bridge-token`.

## Variables de entorno
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Solo server
MQTT_WEBHOOK_SECRET=
BRIDGE_HEARTBEAT_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Payload esperado (webhook)
Ejemplo:
```json
{
  "device_id": "KPCL0001",
  "device_uuid": "uuid-opcional",
  "temperature": 23.5,
  "humidity": 65,
  "weight_grams": 3500,
  "battery_level": 85,
  "flow_rate": 120,
  "timestamp": "2026-02-03T18:30:00Z"
}
```
Notas:
- La API acepta `device_id` (KPCL) o `deviceId` (camelCase) y opcional `device_uuid` (UUID).
- El `device_id` es el código humano (KPCLxxxx).
- Si se envía `device_uuid` (UUID), se busca por `devices.id`.
- Si se envían `device_id` y `device_uuid`, deben corresponder al mismo dispositivo.
- Los campos numéricos pueden llegar como string y se normalizan.
- La inserción de readings es idempotente por `device_uuid + recorded_at`.
- Se guardan dos tiempos: `recorded_at` (dispositivo) y `ingested_at` (servidor).
- Si `recorded_at` difiere más de ±10 min del servidor, se reemplaza por `ingested_at` y se marca `clock_invalid = true`.

## Endpoint de prueba (local)
1. Arranca el servidor:
```bash
npm run dev
```
2. Ejecuta un POST de prueba:
```bash
curl -X POST http://localhost:3000/api/mqtt/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: TU_SECRETO" \
  -d "{\"device_id\":\"KPCL0001\",\"temperature\":23.5,\"humidity\":65,\"weight_grams\":3500,\"battery_level\":85}"
```
Respuesta:
```json
{ "success": true, "idempotent": false }
```

## Script local (PowerShell)
```powershell
cd kittypau_app
$env:MQTT_WEBHOOK_SECRET="TU_SECRETO"
.\scripts\test-webhook.ps1
```

## Streaming en vivo
- Usar **Supabase Realtime** para la tabla `readings`.
- Suscribirse por `device_uuid` en el dashboard.
- Fallback: polling cada X segundos si Realtime falla.

## Auditoria
- Tabla `audit_events` (server-only).
- Eventos actuales: `profile_created`, `profile_updated`, `pet_created`, `device_created`, `reading_ingested`.
- Eventos operativos: `bridge_status_changed`, `bridge_offline_detected`, `device_offline_detected`,
  `general_device_outage_detected`, `general_device_outage_recovered`.
Nota: no se expone a frontend (solo service role).

## Modelo admin
- Tabla: `admin_roles` (`user_id`, `role`, `active`).
- Roles soportados: `owner_admin`, `ops_admin`, `support_admin`, `readonly_admin`.
- Vista: `admin_dashboard_live` (KPCL online/offline, bridges online/offline, incidentes 24h).
- Ruta UI: `/admin`.

## Notas sobre Vercel Free
- Mantener el API liviano (validación y escritura en DB).
- Evitar tareas pesadas o de larga duración en serverless.
- Revisar limites actuales del plan Free en la documentación oficial antes de escalar.

## Checklist MVP
- [ ] Auth funcionando (Supabase)
- [ ] CRUD mascotas
- [ ] CRUD dispositivos
- [ ] Webhook MQTT insertando en DB
- [ ] Dashboard con Realtime

## Contrato de errores (resumen)
Reglas comunes:
- 401 si falta o es invalido Authorization (o x-webhook-token).
- 403 si el recurso no pertenece al usuario.
- 404 si el recurso no existe.
- 400 si payload es invalido o falla una validacion.
- 500 si Supabase o servidor fallan.
- 429 si supera rate limit.
- 413 si payload supera el limite permitido.

Formato estandar:
```json
{
  "error": "Mensaje",
  "code": "CODIGO_ERROR",
  "request_id": "uuid",
  "details": "opcional"
}
```
Notas:
- El backend registra `request_id` en logs server-side (errores y webhook OK).

Rate limits actuales (best effort):
- `/api/mqtt/webhook`: 60 req/min por IP.
- Mutaciones (`PUT /api/profiles`, `POST/PATCH /api/pets`, `POST/PATCH /api/devices`): 30 req/min por usuario.
- Distribuido si existe Upstash (envs `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).

Limites de payload:
- Mutaciones JSON: ~8 KB.
- Webhook MQTT: ~10 KB.

Rangos validados (server):
- `weight_kg`: 0–50
- `battery_level`: 0–100
- `readings?limit`: 1–200

Errores por endpoint:
1. GET /api/devices
   - 401 si falta token.
2. POST /api/devices
   - 400 device_id, device_type, and pet_id are required
   - 400 device_id must match KPCL0000 format
   - 400 Invalid device_type
   - 400 Invalid status
   - 404 Pet not found
   - 401 si falta token.
3. PATCH /api/devices/:id
   - 400 Invalid status | Invalid device_state | Invalid device_type | No fields to update
   - 403 Forbidden
   - 404 Device not found
4. POST /api/mqtt/webhook
   - 401 Unauthorized
  - 400 Invalid JSON | Missing device_id | device_id must match KPCL0000 format | <campo> out of range
   - 404 Device not found
5. PATCH /api/pets/:id
   - 400 Invalid type | Invalid pet_state | Invalid pet_onboarding_step | weight_kg must be a number | No fields to update
   - 403 Forbidden
   - 404 Pet not found
6. POST /api/pets
   - 400 name and type are required
   - 400 Invalid type
   - 400 Invalid pet_state
   - 400 Invalid pet_onboarding_step
   - 400 weight_kg must be a number
   - 401 si falta token.
## Nota sobre validaciones
Los enums de `origin`, `living_environment`, `size`, `activity_level`, `age_range`, `alone_time` se validan en frontend/backend.
El SQL actual solo impone constraints en `type` y `pet_state` para `pets`.

## Alineación DB ↔ API (estado actual)
- **En DB (constraints activas):**
  - `devices.device_id` formato `KPCL0000`.
  - `devices.device_type`, `devices.status`, `devices.device_state`.
  - `profiles.user_onboarding_step`, `profiles.care_rating`.
  - `pets.type`, `pets.pet_state`, `pets.pet_onboarding_step`.
  - `readings` con `clock_invalid`/`ingested_at` y deduplicación `device_uuid + recorded_at`.
- **En API (validación adicional, no estricta en DB):**
  - `profiles.notification_channel` (email/whatsapp/push/sms).
  - Rangos numéricos (`battery_level`, `weight_kg`, `readings.limit`).
  - Campos de mascota (`origin`, `living_environment`, `size`, `activity_level`, `age_range`, `alone_time`).

### Recomendación
Si quieres endurecer DB sin romper datos existentes:
1. **Auditar** valores actuales (query de distribución).
2. **Normalizar** datos fuera de rango (update).
3. **Agregar constraints** con `IF NOT EXISTS`.










