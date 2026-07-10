---
tags: [lib, servicios, hooks, supabase, mqtt, context]
area: App
estado: activo
actualizado: 2026-06-24
---

# Lib y Servicios (`src/lib/`)

Todos los servicios, hooks y utilidades centrales de la app.

## auth/

| Archivo | Descripción |
|---|---|
| `auth-fetch.ts` | Wrapper de `fetch` que adjunta automáticamente el JWT de Supabase en cada request |
| `token.ts` | Gestión del token de sesión en el cliente |

## supabase/

| Archivo | Descripción |
|---|---|
| `browser.ts` | Cliente Supabase para componentes React (browser) |
| `server.ts` | Cliente Supabase para Server Components y API Routes (con cookies) |
| `user-server.ts` | Helpers para obtener datos del usuario desde el servidor |
| `analytics.ts` | Conexión a la base de datos de analytics separada |

## hooks/

| Archivo | Descripción |
|---|---|
| `useMqttLive.ts` | Hook que conecta vía WebSocket a HiveMQ y expone los datos en tiempo real del dispositivo KPCL |

Uso típico:
```tsx
const { data, connected } = useMqttLive({ deviceId })
```

## context/

| Archivo | Descripción |
|---|---|
| `app-context.tsx` | Context global de la app — estado compartido entre vistas (mascota seleccionada, dispositivo activo, etc.) |

## runtime/

| Archivo | Descripción |
|---|---|
| `app-flavor.ts` | Detecta si la app corre en modo `web` o `android` (Capacitor). Controla comportamientos específicos de cada plataforma |
| `selection-sync.ts` | Sincroniza la selección de dispositivo/mascota entre componentes |

## time/

| Archivo | Descripción |
|---|---|
| `chile.ts` | Utilidades para manejo de fechas y horas en zona horaria de Chile (`America/Santiago`) |

## charts/

| Archivo | Descripción |
|---|---|
| `index.tsx` | Componentes de gráficos reutilizables basados en Chart.js y D3 |

Componentes de página que usan gráficos:
- `(app)/today/DayCycleChart.tsx` — Gráfico de ciclo diario de alimentación

## battery/

| Archivo | Descripción |
|---|---|
| `contract.ts` | Tipos TypeScript para el estado de batería del dispositivo KPCL (niveles, estados, umbrales) |

## observability/

| Archivo | Descripción |
|---|---|
| `reading-gaps.ts` | Detecta gaps (ausencias) en las lecturas del sensor — útil para identificar desconexiones o fallas |

## finance/

| Archivo | Descripción |
|---|---|
| `kpcl-catalog.ts` | Catálogo de componentes y costos del hardware KPCL — usado en el módulo de finanzas admin |

## errors/

| Archivo | Descripción |
|---|---|
| `kittypau-error.ts` | Clase de error personalizada `KittypauError` con códigos y mensajes tipados |

## ui/

| Archivo | Descripción |
|---|---|
| `battery-status-icon.tsx` | Componente ícono de batería que cambia visualmente según el nivel |

## Links relacionados

- [[FRONT_BACK_APIS]]
- [[../03_IoT/TOPICOS_MQTT]]
- [[../05_DevOps/ENV_VARIABLES]]
- [[ESTRUCTURA_APP]]
