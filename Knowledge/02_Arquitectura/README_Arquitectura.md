---
id: readme_arquitectura
title: Arquitectura del Sistema Kittypau
type: architecture
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - arquitectura
  - stack
  - nextjs
  - supabase
  - mqtt
related:
  - [[00_HOME]]
  - [[01_Proyecto/README_Proyecto]]
  - [[07_MQTT/README_MQTT]]
  - [[03_Backend/README_Backend]]
  - [[04_Frontend/README_Frontend]]
  - [[06_BaseDatos/README_BaseDatos]]
---

# Arquitectura del Sistema Kittypau

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js | 16.1.6 |
| UI | React | 19.2.3 |
| Estilos | Tailwind CSS | 4 |
| Lenguaje | TypeScript | 5 |
| Backend / Auth / DB | Supabase | 2.106.1 |
| Mensajería IoT | MQTT (HiveMQ WebSocket) | 5.10.4 |
| Mobile | Capacitor (Android) | 8.2.0 |
| Gráficos | Chart.js + D3 | 4.5.1 / 7.9.0 |
| Chatbot IA | Hugging Face Llama 3.1 8B | — |
| Deploy | Vercel | — |
| Iconos | Lucide Icons | 0.542.0 |

---

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

---

## Capas de la aplicación

### Frontend (Next.js App Router)

- Rutas protegidas: `src/app/(app)/`
- Rutas públicas: `src/app/(public)/`
- API Routes: `src/app/api/`
- Componentes globales: `src/app/_components/`

### Servicios internos (`src/lib/`)

| Módulo | Responsabilidad |
|--------|----------------|
| `auth/` | auth-fetch, token management |
| `supabase/` | Clientes browser/server, analytics, user-server |
| `hooks/` | `useMqttLive` — datos MQTT en tiempo real (browser) |
| `context/` | app-context global state (perfil, mascota activa, KPCL) |
| `runtime/` | app-flavor (web vs android), selection-sync |
| `time/` | Utilidades timezone Chile (`America/Santiago`) |
| `charts/` | Componentes Chart.js / D3 |
| `battery/` | Contrato TypeScript del estado de batería |
| `observability/` | Detección de gaps en lecturas |
| `finance/` | Catálogo de perfiles de manufactura KPCL |
| `errors/` | Errores tipados del dominio Kittypau |
| `ui/` | Componentes UI compartidos (battery-status-icon) |

### Backend (API Routes principales)

| Endpoint | Función |
|----------|---------|
| `/api/readings` | Lecturas del dispositivo (paginadas) |
| `/api/readings/bucketed` | Lecturas en buckets para gráficos |
| `/api/devices/[id]/sessions` | Sesiones de bowl del dispositivo |
| `/api/bridge/heartbeat` | Heartbeat del bridge (requiere `BRIDGE_HEARTBEAT_SECRET`) |
| `/api/bridge/health-check` | Estado del bridge (solo admin) |
| `/api/admin/overview` | Panel admin resumen |

Ver contrato completo en [[05_API/README_API]].

### Base de datos

- Supabase PostgreSQL — datos operacionales (ver [[06_BaseDatos/README_BaseDatos]])
- Supabase Analytics — base de datos separada (`pet_sessions`, `pet_daily_summary`)
- Bridge escribe directo a Supabase con `service_role key` (bypass RLS)

### Mobile

- Capacitor 8 para compilación APK Android
- `NEXT_PUBLIC_APP_FLAVOR` controla comportamiento web vs mobile

---

## Decisiones de diseño clave

| Decisión | Razón |
|----------|-------|
| Sin servidor propio | Todo corre en Vercel (API Routes) + Supabase |
| Bridge en Raspberry | HiveMQ Free no tiene webhooks; el bridge los genera |
| Dual DB | Supabase principal + Supabase Analytics separado para no mezclar cargas |
| app-flavor | Una sola codebase para web y APK Android |

---

## ADRs relacionados

- [[23_Decisiones/ADR_001_MQTT_vs_HTTP]]
- [[23_Decisiones/ADR_002_Supabase]]
- [[23_Decisiones/ADR_004_StreamlitAnnotation]]

---

## Ver también

- [[02_Arquitectura/MOC_Arquitectura]]
- [[07_MQTT/README_MQTT]]
- [[06_BaseDatos/README_BaseDatos]]
- [[03_Backend/README_Backend]]
- [[04_Frontend/README_Frontend]]
