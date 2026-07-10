---
id: readme_backend
title: Backend — Supabase + API Routes + Bridge
type: backend
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - supabase
  - nextjs
  - api-routes
  - bridge
  - backend
related:
  - [[00_HOME]]
  - [[02_Arquitectura/README_Arquitectura]]
  - [[06_BaseDatos/README_BaseDatos]]
  - [[07_MQTT/README_MQTT]]
  - [[05_API/README_API]]
  - [[23_Decisiones/ADR_002_Supabase]]
---

# Backend — Supabase + API Routes + Bridge

El backend del producto Kittypau está compuesto por tres capas:

1. **Supabase** — base de datos PostgreSQL + auth + RLS
2. **Next.js API Routes** — lógica de negocio expuesta como endpoints HTTP
3. **Bridge Raspberry** — ingesta de datos IoT desde MQTT a Supabase

---

## Supabase

**Proyecto principal:** instancia Supabase con PostgreSQL.  
**Proyecto analytics:** instancia separada (`supabase-analytics`).

| Capa | Descripción |
|---|---|
| Auth | Supabase Auth con JWT. `auth.users` enlaza a `profiles` (1:1). |
| RLS | Row Level Security activa en todas las tablas públicas. |
| Service Role | El bridge bypasea RLS con `service_role key`. |
| Realtime | No usado directamente — el tiempo real va por MQTT (HiveMQ). |
| Edge Functions | Sin Edge Functions activas en producción actualmente. |

Ver esquema completo de tablas en [[06_BaseDatos/README_BaseDatos]].

---

## Next.js API Routes (`src/app/api/`)

Las rutas API de Next.js actúan como BFF (Backend for Frontend).
Todas las rutas protegidas verifican el JWT de Supabase antes de operar.

### Rutas principales

Ver contrato completo en [[05_API/README_API]].

| Ruta | Método | Descripción |
|---|---|---|
| `/api/profiles` | GET/PATCH | Perfil del usuario autenticado |
| `/api/pets` | GET/POST/PATCH | Mascotas del usuario |
| `/api/devices` | GET/POST | Dispositivos KPCL del usuario |
| `/api/devices/[id]/tare` | POST | Comando de tara → `device_commands` |
| `/api/devices/[id]/interval` | POST | Cambio de intervalo → `device_commands` |
| `/api/devices/[id]/sessions` | GET | Sesiones de bowl del dispositivo |
| `/api/readings` | GET | Lecturas del dispositivo (paginadas, params: `from`,`to`,`limit`) |
| `/api/readings/bucketed` | GET | Lecturas en buckets de N segundos para gráficos |
| `/api/analytics/sessions` | GET | Sesiones analytics DB |
| `/api/analytics/daily` | GET | Resumen diario (analytics DB) |
| `/api/bridge/heartbeat` | POST | Heartbeat del bridge (requiere `BRIDGE_HEARTBEAT_SECRET`) |
| `/api/bridge/health-check` | GET | Estado del bridge (solo admin) |
| `/api/admin/*` | varios | Panel admin — solo con rol en `admin_roles` |

### Módulos clave en `src/lib/`

| Módulo | Función |
|---|---|
| `lib/auth/auth-fetch.ts` | Adjunta JWT a cada request |
| `lib/auth/token.ts` | Refresca el JWT automáticamente al expirar |
| `lib/supabase/server.ts` | Cliente Supabase con SSR (server components) |
| `lib/supabase/browser.ts` | Cliente Supabase para client components |
| `lib/supabase/analytics.ts` | Cliente Supabase Analytics (instancia separada) |
| `lib/supabase/user-server.ts` | Helper server-side para obtener usuario autenticado |
| `lib/context/app-context.tsx` | Estado global de la app (perfil, mascota activa, KPCL activo) |
| `lib/hooks/useMqttLive.ts` | Hook para lecturas MQTT en tiempo real (browser) |
| `lib/time/chile.ts` | Timezone `America/Santiago` para todas las fechas |
| `lib/battery/contract.ts` | Contrato TypeScript del estado de batería |
| `lib/observability/reading-gaps.ts` | Detección de gaps en lecturas (batería agotada, offline) |
| `lib/finance/kpcl-catalog.ts` | Catálogo de perfiles de manufactura KPCL |
| `lib/errors/kittypau-error.ts` | Errores tipados del dominio Kittypau |
| `lib/runtime/app-flavor.ts` | Detecta si es web o Android (NEXT_PUBLIC_APP_FLAVOR) |
| `lib/runtime/selection-sync.ts` | Sincroniza la mascota/dispositivo seleccionado |

---

## Bridge Raspberry Pi

Servicio Node.js (`kittypau-mqtt-bridge` v3.2) que corre 24/7 en Raspberry Pi Zero 2 W.

**Rol:** recibe mensajes MQTT de los KPCL y los persiste en Supabase directamente, con service_role key (bypass RLS).

Ver documentación completa en [[07_MQTT/README_MQTT]].

### Cadena de datos

```
KPCL (ESP8266) → HiveMQ (MQTT TLS 8883) → Bridge (Node.js en Pi) → Supabase
                                                     ↓
                                             Supabase Analytics
```

---

## Flujo de comandos a dispositivos

```
App (usuario) → POST /api/devices/{id}/tare
                         ↓
                INSERT en device_commands (pending)
                         ↓
Bridge consulta device_commands cada 5 s
                         ↓
Bridge publica {DEVICE_ID}/cmd via MQTT
                         ↓
KPCL ejecuta comando → marca executed en device_commands
```

---

## Variables de entorno clave

| Variable | Dónde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo server-side — nunca exponer |
| `SUPABASE_ANALYTICS_URL` / `_KEY` | Analytics (opcional — degrada si falta) |
| `NEXT_PUBLIC_APP_FLAVOR` | `web` o `android` |

---

## Ver también

- [[06_BaseDatos/README_BaseDatos]] — inventario de tablas
- [[07_MQTT/README_MQTT]] — bridge y tópicos MQTT
- [[05_API/README_API]] — contratos de endpoints
- [[23_Decisiones/ADR_002_Supabase]] — decisión de usar Supabase
