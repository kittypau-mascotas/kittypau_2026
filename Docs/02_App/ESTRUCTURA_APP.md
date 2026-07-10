---
tags: [app, estructura, nextjs, typescript, capacitor]
area: App
estado: activo
actualizado: 2026-06-24
---

# Estructura de la App (kittypau_app)

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| Next.js | 16.1.6 | Framework principal |
| React | 19.2.3 | UI |
| TypeScript | 5 | Tipado |
| Tailwind CSS | 4 | Estilos |
| Supabase | 2.106.1 | DB + Auth |
| MQTT | 5.10.4 | IoT tiempo real |
| Capacitor | 8.2.0 | APK Android |
| Chart.js | 4.5.1 | Gráficos |
| D3 | 7.9.0 | Visualización |
| Lucide Icons | 0.542.0 | Iconografía |

## Estructura de carpetas

```
kittypau_app/
├── src/
│   ├── app/
│   │   ├── (app)/              ← Rutas protegidas (auth requerida)
│   │   │   ├── _components/    ← Componentes del layout protegido
│   │   │   ├── inicio/
│   │   │   ├── today/
│   │   │   ├── bowl/
│   │   │   ├── pet/
│   │   │   ├── dispositivos/
│   │   │   ├── registro/
│   │   │   ├── settings/
│   │   │   ├── story/
│   │   │   └── admin/
│   │   ├── (public)/           ← Rutas públicas (sin auth)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── reset/
│   │   │   ├── demo/
│   │   │   └── client-demo/
│   │   ├── api/                ← API Routes Next.js
│   │   ├── _components/        ← Componentes globales
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── lib/
│   │   ├── auth/               ← auth-fetch.ts, token.ts
│   │   ├── battery/            ← contract.ts (tipos batería)
│   │   ├── charts/             ← index.tsx (Chart.js/D3)
│   │   ├── context/            ← app-context.tsx (estado global)
│   │   ├── errors/             ← kittypau-error.ts
│   │   ├── finance/            ← kpcl-catalog.ts
│   │   ├── hooks/              ← useMqttLive.ts
│   │   ├── observability/      ← reading-gaps.ts
│   │   ├── runtime/            ← app-flavor.ts, selection-sync.ts
│   │   ├── supabase/           ← browser.ts, server.ts, analytics.ts
│   │   ├── time/               ← chile.ts (timezone)
│   │   └── ui/                 ← battery-status-icon.tsx
│   ├── types/
│   │   └── mqtt.d.ts
│   ├── chatbot-gato/           ← Sistema chatbot IA
│   └── proxy.ts
├── android/                    ← Proyecto Capacitor Android
├── public/                     ← Assets estáticos
├── next.config.ts
├── capacitor.config.ts
├── tailwind.config.ts
└── package.json
```

## Scripts NPM

| Script | Descripción |
|---|---|
| `npm run dev` | Dev server web (localhost:3000) |
| `npm run dev:mobile` | Dev en dispositivo Android vía Capacitor |
| `npm run build` | Build producción |
| `npm run android:sync` | Sincronizar cambios Next.js → Android |
| `npm run android:open` | Abrir proyecto en Android Studio |
| `npm run android:build:debug` | Generar APK debug |
| `npm run lint` | Lint con ESLint |
| `npm run type-check` | Verificar tipos TypeScript |
| `npm run fix:all` | lint:fix + clean:imports + format |
| `npm run dev:check` | fix:all + type-check + encoding-check |
| `npm run ci:check` | dev:check + build |

## Modo web vs mobile

Controlado por `NEXT_PUBLIC_APP_FLAVOR`:
- `web` — comportamiento estándar web
- `android` — activa lógica específica de APK (Capacitor, notificaciones nativas)

Ver `src/lib/runtime/app-flavor.ts`

## Links relacionados

- [[RUTAS_Y_PAGINAS]]
- [[LIB_Y_SERVICIOS]]
- [[../05_DevOps/ENV_VARIABLES]]
- [[Mobile/APK_ANDROID_STUDIO_KITTYPAU]]
- [[../01_Arquitectura/ARQUITECTURA_PROYECTO]]
