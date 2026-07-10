---
tags: [api, frontend, backend, nextjs, supabase]
area: App
estado: activo
actualizado: 2026-06-24
---

# Frontend, Backend y APIs

## Decisión de arquitectura

- **Frontend**: Next.js App Router en Vercel
- **Backend**: API Routes de Next.js (mismo repo, sin servidor separado)
- **DB/Auth**: Supabase
- **MQTT**: HiveMQ Cloud → Raspberry Bridge → `/api/mqtt/webhook`
- **Caché/Cron**: Upstash Redis

## API Routes disponibles

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/mqtt/webhook` | POST | Recibe datos del bridge Raspberry → inserta en Supabase |
| `/api/bridge/heartbeat` | POST | Health check del bridge (autenticado con `BRIDGE_HEARTBEAT_SECRET`) |
| `/api/auth/*` | * | Endpoints de autenticación Supabase |
| `/api/admin/*` | * | Endpoints panel admin (requieren rol admin) |

## Autenticación

- Supabase Auth (JWT)
- `lib/auth/auth-fetch.ts` — wrapper de fetch que adjunta token automáticamente
- `lib/auth/token.ts` — gestión del token en cliente
- `lib/supabase/server.ts` — cliente server-side con cookies
- `lib/supabase/browser.ts` — cliente browser-side

## Seguridad de API Routes

| Secret | Uso |
|---|---|
| `MQTT_WEBHOOK_SECRET` | Valida llamadas del bridge al webhook MQTT |
| `BRIDGE_HEARTBEAT_SECRET` | Valida heartbeat del bridge |
| `CRON_SECRET` | Valida cron jobs de Vercel |

## Flujo de datos en tiempo real (MQTT)

```
KPCL Hardware → HiveMQ (MQTT) → Raspberry Bridge → POST /api/mqtt/webhook
     → Supabase insert → useMqttLive hook → UI actualiza
```

## Clientes Supabase

| Archivo | Uso |
|---|---|
| `lib/supabase/browser.ts` | Componentes cliente (React) |
| `lib/supabase/server.ts` | Server Components y API Routes |
| `lib/supabase/user-server.ts` | Datos del usuario en server |
| `lib/supabase/analytics.ts` | Conexión a DB analytics separada |

## Links relacionados

- [[LIB_Y_SERVICIOS]]
- [[../05_DevOps/ENV_VARIABLES]]
- [[../03_IoT/BRIDGE_HEALTHCHECK]]
- [[../03_IoT/TOPICOS_MQTT]]
