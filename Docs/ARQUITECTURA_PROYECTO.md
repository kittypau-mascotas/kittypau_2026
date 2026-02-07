# Arquitectura del Proyecto Kittypau (MVP $0)

## Objetivo
Tener un MVP funcional donde el usuario:
1. Se registra e inicia sesion.
2. Agrega una mascota.
3. Registra un dispositivo (plato comida/agua).
4. Ve datos en vivo desde la app web.

---

## Componentes
1. **Frontend + API**: Next.js (App Router) en Vercel.
2. **DB/Auth/Realtime**: Supabase.
3. **MQTT**: HiveMQ Cloud.
4. **Bridge 24/7**: Raspberry Pi Zero 2 W (MQTT -> API).
   - El codigo fuente vive en el repo (`/bridge`).
   - El runtime real esta fuera del repo (Raspberry).

---

## Registro en pop-up (UX global)
- El flujo de registro ocurre en un pop-up (web y movil).
- Barra de progreso con 3 hitos: Usuario -> Mascota -> Dispositivo.
- El progreso se guarda si el usuario cierra.

## Diagrama de alto nivel
```
ESP32 -> HiveMQ -> Raspberry Bridge -> /api/mqtt/webhook -> Supabase (DB)
                                                    \-> Realtime -> App Web
```

---

## Regla de conexion (importante)
- **La app web NO se conecta a HiveMQ**.
- **La Raspberry (bridge) SI se conecta a HiveMQ** y reenvia a Vercel.
- **La app web solo consume Supabase** (Auth + DB + Realtime).

Esto evita exponer credenciales MQTT en frontend y mantiene el flujo seguro.

---

## Flujo de datos (telemetria)
1. ESP32 publica MQTT en HiveMQ.
2. Raspberry Bridge escucha MQTT y reenvia a Vercel.
3. API valida el token y guarda lectura en Supabase.
4. Supabase Realtime actualiza el dashboard.

## Registro de dispositivo (paso esencial)
- El usuario escanea el QR en la parte inferior del plato.
- El QR entrega el `device_code`.
- El dispositivo se asocia a una mascota para activar envio de datos.

---

## Diagramas detallados
### Local (desarrollo)
```
ESP32 (LAN) -> HiveMQ Cloud
                 |
          Webhook -> http://localhost:3000/api/mqtt/webhook
                 |
             Supabase (DB + Realtime)
                 |
             App Web (localhost:3000)
```

### Produccion (Vercel)
```
ESP32 -> HiveMQ Cloud
           |
     https://tu-app.vercel.app/api/mqtt/webhook
           |
       Supabase (DB + Realtime)
           |
       App Web (Vercel)
```

---

## Estructura del repositorio
```
/Docs
/kittypau_app
  /src
    /app
    /lib
    /components
  /scripts
  /public
```

---

## Decisiones tecnicas (tradeoffs)
1. **Next.js + API Routes**:
   - Pros: un solo deploy, costo $0, menos infraestructura.
   - Contras: serverless con limites de ejecucion y cold starts.

2. **Supabase Realtime**:
   - Pros: streaming listo sin infra propia.
   - Contras: dependes del servicio; hay limites en free tier.

3. **HiveMQ Webhook**:
   - Pros: sencillo, compatible con serverless.
   - Contras: depende de endpoint publico y token seguro.

---

## Endpoints y contratos (MVP)
### 1) `POST /api/mqtt/webhook`
**Headers**
- `x-webhook-token: <secret>`

**Body (ejemplo)**
```json
{
  "deviceCode": "KPCL0001",
  "temperature": 23.5,
  "humidity": 65,
  "weight_grams": 3500,
  "battery_level": 85,
  "timestamp": "2026-02-03T18:30:00Z"
}
```
**Notas**
- La API acepta `deviceCode`, `deviceId` o `device_id`.
- El `device_code` es el codigo humano (KPCLxxxx) y se busca en `devices`.

**Response**
```json
{ "success": true }
```

---

### 2) `GET /api/pets`
**Response**
```json
[
  { "id": "uuid", "name": "Michi", "type": "cat" }
]
```

### 3) `POST /api/pets`
**Body**
```json
{ "name": "Michi", "type": "cat", "origin": "rescatado" }
```
**Response**
```json
{ "id": "uuid" }
```

---

### 4) `GET /api/devices`
**Response**
```json
[
  { "id": "uuid", "device_code": "KPCL0001", "device_type": "food_bowl" }
]
```

### 5) `POST /api/devices`
**Body**
```json
{
  "device_code": "KPCL0001",
  "device_type": "food_bowl",
  "pet_id": "uuid"
}
```
**Response**
```json
{ "id": "uuid" }
```

---

### 6) `GET /api/readings?device_id=uuid`
**Response**
```json
[
  {
    "device_id": "uuid",
    "weight_grams": 3500,
    "battery_level": 85,
    "recorded_at": "2026-02-03T18:30:00Z"
  }
]
```

---

## Seguridad
- Webhook protegido por `x-webhook-token`.
- RLS en Supabase para limitar datos por usuario.
- Service role solo en el backend (API routes).

---

## Deploy (Vercel)
El deploy incluye:
1. Frontend web.
2. API routes (webhook + CRUD).
3. Backend ligero serverless.

---

## Estado actual (hasta 2026-02-03)
- Next.js creado en `kittypau_app/` con TypeScript y App Router.
- Endpoint webhook creado en `src/app/api/mqtt/webhook/route.ts`.
- Cliente Supabase server creado en `src/lib/supabase/server.ts`.
- Script de prueba creado en `scripts/test-webhook.ps1`.
- `.env.local` creado en `kittypau_app/`.
- Webhook local probado con exito (respuesta `success: true`).

---

## Pendientes inmediatos
- Crear y poblar `pets` y `devices` desde la app.
- Crear UI base (login, mascotas, dispositivos, dashboard).
- Configurar deploy en Vercel.
- Configurar webhook en HiveMQ con URL publica.
- Verificar Realtime en dashboard.
