---
tags: [env, variables, secretos, configuracion]
area: DevOps
estado: activo
actualizado: 2026-06-24
---

# Variables de Entorno

## Públicas (`NEXT_PUBLIC_*`)

Expuestas al cliente. Sin datos sensibles.

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL base del sitio (ej: `https://kittypau.vercel.app`) |
| `NEXT_PUBLIC_APP_FLAVOR` | `web` o `android` — activa comportamiento Capacitor |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase (anon key) |
| `NEXT_PUBLIC_MQTT_BROKER` | Host del broker HiveMQ |
| `NEXT_PUBLIC_MQTT_PORT_WS` | Puerto WebSocket MQTT (default: 8884) |
| `NEXT_PUBLIC_MQTT_USER_READONLY` | Usuario MQTT con permisos solo lectura |
| `NEXT_PUBLIC_MQTT_PASS_READONLY` | Contraseña del usuario MQTT readonly |
| `CAPACITOR_SERVER_URL` | URL que usa Capacitor en modo dev mobile |

## Secretas (server-only)

Solo disponibles en Server Components y API Routes. Nunca se exponen al cliente.

### Supabase

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL Supabase (server) |
| `SUPABASE_ANON_KEY` | Anon key Supabase (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — acceso total sin RLS |
| `SUPABASE_ANALYTICS_URL` | URL base de datos analytics separada |
| `SUPABASE_ANALYTICS_SERVICE_KEY` | Service key DB analytics |

### Seguridad API

| Variable | Descripción |
|---|---|
| `MQTT_WEBHOOK_SECRET` | Valida que el bridge es quien llama al webhook MQTT |
| `BRIDGE_HEARTBEAT_SECRET` | Valida heartbeat del bridge Raspberry |
| `CRON_SECRET` | Autentifica cron jobs de Vercel |

### Caché y Redis

| Variable | Descripción |
|---|---|
| `UPSTASH_REDIS_REST_URL` | URL de Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token de acceso Upstash |

### Servicios externos

| Variable | Descripción |
|---|---|
| `VERCEL_API_TOKEN` | Token API de Vercel (para operaciones automáticas) |
| `HF_TOKEN` | Token de Hugging Face (chatbot gato) |
| `HF_MODEL` | ID del modelo HF (`meta-llama/Llama-3.1-8B-Instruct`) |

## Archivos de referencia en el repo

```
Docs/05_DevOps/
├── .env.bridge.example    ← Variables del bridge Raspberry
├── .env.test.example      ← Variables para tests
└── .env.test.local        ← Variables locales de test (no commitear)
```

## Dónde configurar

| Entorno | Dónde |
|---|---|
| Producción / Preview | Vercel Dashboard → Settings → Environment Variables |
| Local web | `.env.local` en raíz de `kittypau_app/` |
| Local mobile | `.env.local` + `capacitor.config.ts` |
| Bridge | `.env` en carpeta `bridge/` |

## Links relacionados

- [[CHECKLIST_DEPLOY]]
- [[../02_App/FRONT_BACK_APIS]]
- [[../03_IoT/BRIDGE_HEALTHCHECK]]
- [[SETUP_LOCAL]]
