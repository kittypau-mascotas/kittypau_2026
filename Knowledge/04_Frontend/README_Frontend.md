---
id: readme_frontend
title: Frontend — App Kittypau (Next.js + Capacitor)
type: frontend
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-11
tags:
  - nextjs
  - react
  - capacitor
  - android
  - tailwind
related:
  - [[00_HOME]]
  - [[02_Arquitectura/README_Arquitectura]]
  - [[05_API/README_API]]
  - [[03_Backend/README_Backend]]
  - [[04_Frontend/ESTRUCTURA_src_app]]
---

# Frontend — App Kittypau

**Repo:** `kittypau_app/`  
**Deploy:** Vercel (web) + Capacitor (Android APK)

---

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| Next.js | 16.1.6 | Framework principal — App Router |
| React | 19.2.3 | UI |
| TypeScript | 5 | Tipado |
| Tailwind CSS | 4 | Estilos |
| Supabase | 2.106.1 | DB + Auth client |
| MQTT | 5.10.4 | IoT tiempo real |
| Capacitor | 8.2.0 | APK Android |
| Chart.js | 4.5.1 | Gráficos |
| Lucide Icons | 0.542.0 | Iconografía |
| @vercel/analytics | 2.0.1 | Web Analytics — visitantes/page views en el dashboard de Vercel |

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (app)/               ← Rutas protegidas (auth requerida)
│   │   ├── inicio/          ← Solo redirect a /today (no tiene UI propia)
│   │   ├── today/           ← Actividad del día — dashboard real de la app
│   │   ├── bowl/            ← Monitoreo del comedero en tiempo real (MQTT)
│   │   ├── pet/             ← Perfil de la mascota
│   │   ├── dispositivos/    ← Gestión KPCL (solo /dispositivos/nuevo tiene page.tsx)
│   │   ├── registro/        ← Alta de nuevos dispositivos (registro-flow.tsx)
│   │   ├── settings/        ← Configuración
│   │   ├── story/           ← Historial y análisis
│   │   └── admin/           ← Panel administrador — SOLO 3 rutas tienen page.tsx real:
│   │                            /admin (dashboard), /admin/javo, /admin/demo-ingresos.
│   │                            /admin/alerts, /admin/analytics, /admin/devices, /admin/legacy,
│   │                            /admin/overview, /admin/pets, /admin/settings existen como
│   │                            carpetas VACÍAS (0 archivos) — 404 real si se navega ahí.
│   ├── (public)/            ← Rutas públicas (sin auth)
│   │   ├── login/           ← también aloja el modal de registro (?register=1)
│   │   ├── register/
│   │   ├── reset/
│   │   ├── demo/            ← demo sin login, acepta ?menu=today|story|pet|bowl
│   │   ├── client-demo/     ← verificado: renderiza el mismo contenido que /demo
│   │   └── test/            ← verificado: renderiza el mismo contenido que /demo (no es una página propia)
│   └── api/                 ← API Routes Next.js — 30 route.ts, ver [[05_API/README_API]]
├── lib/
│   ├── auth/                ← auth-fetch.ts, token.ts
│   ├── battery/             ← contract.ts (estado batería KPCL)
│   ├── charts/              ← Chart.js/D3
│   ├── context/             ← app-context.tsx (estado global: perfil, mascota, KPCL)
│   ├── errors/              ← kittypau-error.ts (manejo de errores tipados)
│   ├── finance/             ← kpcl-catalog.ts (catálogo de perfiles de manufactura)
│   ├── hooks/               ← useMqttLive.ts
│   ├── observability/       ← reading-gaps.ts (detección de gaps en lecturas)
│   ├── runtime/             ← app-flavor.ts (web vs android), selection-sync.ts
│   ├── supabase/            ← browser.ts, server.ts, analytics.ts, user-server.ts
│   ├── time/                ← chile.ts (timezone America/Santiago)
│   └── ui/                  ← battery-status-icon.tsx (componentes UI compartidos)
├── chatbot-gato/            ← Sistema chatbot IA (13 archivos)
│   ├── client.ts
│   ├── hf.ts
│   ├── personality-canon.ts
│   └── ...context files
└── types/
    └── mqtt.d.ts
```

> ⚠️ `/dispositivos` (ruta raíz) no tiene `page.tsx` — navegar a `/dispositivos` retorna 404.  
> La gestión de dispositivos ocurre en `/dispositivos/nuevo` o en el flujo de `/registro`.

---

## Scripts NPM

| Script | Descripción |
|---|---|
| `npm run dev` | Dev server web (localhost:3000) |
| `npm run build` | Build producción |
| `npm run android:sync` | Sincronizar cambios Next.js → Android |
| `npm run android:build:debug` | Generar APK debug |
| `npm run dev:check` | fix:all + type-check + encoding-check |
| `npm run ci:check` | dev:check + build |

---

## Modo web vs Android

Controlado por `NEXT_PUBLIC_APP_FLAVOR`:
- `web` — comportamiento estándar web
- `android` — activa lógica específica Capacitor (notificaciones nativas, etc.)

Ver `src/lib/runtime/app-flavor.ts`

---

## Flujo de auth

1. Usuario hace login → Supabase retorna JWT
2. `auth-fetch.ts` adjunta el token a cada request API
3. Routes protegidas verifican token en el servidor con `supabase/server.ts`
4. Si expira → `token.ts` refresca automáticamente

---

## MQTT en vivo

`src/lib/hooks/useMqttLive.ts` — conecta al broker HiveMQ directamente desde el browser.
Usado en la ruta `/bowl` para mostrar el peso en tiempo real sin polling.

Variables requeridas (NEXT_PUBLIC_* para que el browser pueda leerlas):
```
NEXT_PUBLIC_MQTT_BROKER          ← host HiveMQ Cloud
NEXT_PUBLIC_MQTT_PORT_WS         ← 8884 (WebSocket TLS)
NEXT_PUBLIC_MQTT_USER_READONLY   ← credenciales de solo-lectura
NEXT_PUBLIC_MQTT_PASS_READONLY
```

Si alguna de estas variables está ausente, el hook falla silenciosamente y `/bowl` no muestra datos en vivo.

---

## Scripts NPM adicionales

| Script | Descripción |
|---|---|
| `npm run dev:web` | Alias de `npm run dev` |
| `npm run dev:mobile` | Corre la app en Android (`npx cap run android`) |
| `npm run android:open` | Abre Android Studio |
| `npm run android:assets` | Genera assets de Capacitor |
| `npm run lint:fix` | ESLint con autofix |
| `npm run format` | Prettier |
| `npm run type-check` | TypeScript sin emit |
| `npm run security-check` | `npm audit --audit-level=high` |

---

## Ver también

- [[04_Frontend/ESTRUCTURA_src_app]] — función de cada carpeta de `src/app`, carpeta por carpeta, con hallazgos de código huérfano
- [[05_API/README_API]] — API Routes expuestas por la app
- [[03_Backend/README_Backend]] — Supabase Edge Functions
- [[02_Arquitectura/README_Arquitectura]] — stack completo del sistema
