---
tags: [arquitectura, stack, nextjs, supabase, mqtt]
area: Arquitectura
estado: activo
actualizado: 2026-06-24
---

# Arquitectura del Proyecto Kittypau

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js | 16.1.6 |
| UI | React | 19.2.3 |
| Estilos | Tailwind CSS | 4 |
| Lenguaje | TypeScript | 5 |
| Backend/Auth/DB | Supabase | 2.106.1 |
| Mensajería IoT | MQTT (HiveMQ WebSocket) | 5.10.4 |
| Mobile | Capacitor (Android) | 8.2.0 |
| Gráficos | Chart.js + D3 | 4.5.1 / 7.9.0 |
| Chatbot IA | Hugging Face Llama 3.1 8B | — |
| Deploy | Vercel | — |
| Iconos | Lucide Icons | 0.542.0 |

## Flujo general del sistema

```
[Hardware KPCL]
      │ MQTT publish
      ▼
[HiveMQ Cloud]
      │ WebSocket / Bridge
      ▼
[Raspberry Pi Zero 2W — Bridge]
      │ HTTP POST
      ▼
[Next.js API Routes en Vercel]
      │ insert
      ▼
[Supabase — PostgreSQL + Auth + Realtime]
      │ query / realtime
      ▼
[App Web / APK Android]
```

## Capas de la aplicación

### Frontend (Next.js App Router)
- Rutas protegidas en `src/app/(app)/`
- Rutas públicas en `src/app/(public)/`
- API Routes en `src/app/api/`
- Componentes globales en `src/app/_components/`

### Servicios internos (`src/lib/`)
- **auth/** — auth-fetch, token management
- **supabase/** — clientes browser/server, analytics
- **hooks/** — useMqttLive (datos en tiempo real)
- **context/** — app-context global state
- **runtime/** — app-flavor (web vs mobile), selection-sync
- **time/** — utilidades timezone Chile
- **charts/** — componentes Chart.js/D3
- **battery/** — contrato de estado de batería
- **observability/** — detección de gaps en lecturas

### Backend (API Routes)
- `/api/mqtt/webhook` — recibe datos del bridge Raspberry
- `/api/bridge/heartbeat` — health check del bridge
- Endpoints admin y autenticación

### Base de datos
- Supabase PostgreSQL (datos operacionales)
- Supabase Analytics (base de datos separada para analytics)
- Upstash Redis (caché y cron)

### Mobile
- Capacitor 8 para compilación APK Android
- `NEXT_PUBLIC_APP_FLAVOR` controla comportamiento web vs mobile

## Decisiones de diseño clave

- **Sin servidor propio**: todo corre en Vercel (API Routes) + Supabase
- **Bridge en Raspberry**: HiveMQ Free no tiene webhooks, el bridge los genera
- **Dual DB**: Supabase principal + Supabase Analytics separado para no mezclar cargas
- **app-flavor**: una sola codebase para web y APK Android

## Links relacionados

- [[MAPA_ECOSISTEMA]]
- [[DOC_MAESTRO_DOMINIO]]
- [[../03_IoT/BRIDGE_HEALTHCHECK]]
- [[../04_Base_de_Datos/SQL_MAESTRO]]
- [[../02_App/ESTRUCTURA_APP]]
