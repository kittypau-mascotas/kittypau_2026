# Frontend, Backend y APIs (MVP Kittypau)

## Decision tecnica
- **Frontend**: Next.js (App Router) en Vercel.
- **Backend**: API Routes de Next.js (sin servicio extra para mantener $0).
- **DB/Auth/Realtime**: Supabase.
- **MQTT**: HiveMQ Cloud -> webhook a `/api/mqtt/webhook`.
 - **Bridge**: Raspberry Pi Zero 2 W (porque HiveMQ Free no ofrece webhooks).

## Que se despliega en Vercel
En este proyecto, **el deploy en Vercel incluye todo**:
1. **Frontend** (UI web).
2. **API** (`/api/*`), incluyendo el webhook de HiveMQ.
3. **Backend ligero** (logica serverless dentro de esas rutas).

No hay backend separado en otro servidor. La base de datos vive en Supabase.

## Objetivo funcional
1. Registro e inicio de sesion.
2. Crear mascota.
3. Registrar dispositivo (plato comida/agua) con QR.
4. Ver datos en vivo (streaming) en la app.

## Registro en pop-up
- Se abre al click de registrarse (web y movil).
- Barra de progreso con 3 hitos: Usuario -> Mascota -> Dispositivo.
- Persistencia si el usuario cierra.

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

## Endpoints minimos (API Routes)
1. `POST /api/mqtt/webhook`
   - Recibe datos desde HiveMQ.
   - Valida `x-webhook-token`.
   - Inserta lectura y actualiza `devices`.
   - Busca el dispositivo por `device_code`.

2. `GET/POST /api/pets`
   - Lista mascotas del usuario.
   - Crea nueva mascota.

3. `GET/POST /api/devices`
   - Lista dispositivos.
   - Registra y asigna dispositivo a mascota.
   - `device_code` se obtiene del QR del plato.

4. `GET /api/readings?device_id=...`
   - Lecturas recientes para graficos.

## Autenticacion para CRUD
Los endpoints `/api/pets`, `/api/devices` y `/api/readings` requieren:
```
Authorization: Bearer <access_token>
```

## Variables de entorno
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Solo server
MQTT_WEBHOOK_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Payload esperado (webhook)
Ejemplo:
```json
{
  "deviceId": "KPCL0001",
  "temperature": 23.5,
  "humidity": 65,
  "weight_grams": 3500,
  "battery_level": 85,
  "timestamp": "2026-02-03T18:30:00Z"
}
```

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
  -d "{\"deviceId\":\"KPCL0001\",\"temperature\":23.5,\"humidity\":65,\"weight_grams\":3500,\"battery_level\":85}"
```

## Script local (PowerShell)
```powershell
cd kittypau_app
$env:MQTT_WEBHOOK_SECRET="TU_SECRETO"
.\scripts\test-webhook.ps1
```

## Streaming en vivo
- Usar **Supabase Realtime** para la tabla `readings`.
- Suscribirse por `device_id` en el dashboard.
- Fallback: polling cada X segundos si Realtime falla.

## Notas sobre Vercel Free
- Mantener el API liviano (validacion y escritura en DB).
- Evitar tareas pesadas o de larga duracion en serverless.
- Revisar limites actuales del plan Free en la documentacion oficial antes de escalar.

## Checklist MVP
- [ ] Auth funcionando (Supabase)
- [ ] CRUD mascotas
- [ ] CRUD dispositivos
- [ ] Webhook MQTT insertando en DB
- [ ] Dashboard con Realtime
