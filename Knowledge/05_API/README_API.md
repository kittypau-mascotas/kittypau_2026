---
id: readme_api
title: API — Contratos de Endpoints
type: api
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - api
  - endpoints
  - nextjs
  - contratos
related:
  - [[00_HOME]]
  - [[03_Backend/README_Backend]]
  - [[04_Frontend/README_Frontend]]
  - [[06_BaseDatos/README_BaseDatos]]
---

# API — Contratos de Endpoints

> API Routes de Next.js bajo `src/app/api/`. Todas las rutas protegidas exigen JWT de Supabase.

---

## Autenticación

Todas las rutas protegidas requieren header:
```
Authorization: Bearer <supabase_jwt>
```

Las rutas de admin además verifican que el usuario tenga rol en `admin_roles`.

---

## Usuarios y mascotas

| Ruta | Método | Auth | Descripción |
|---|---|---|---|
| `/api/profiles` | GET | ✅ usuario | Perfil del usuario autenticado |
| `/api/profiles` | PATCH | ✅ usuario | Actualizar nombre, avatar, etc. |
| `/api/pets` | GET | ✅ usuario | Lista de mascotas del usuario |
| `/api/pets` | POST | ✅ usuario | Crear mascota |
| `/api/pets/[id]` | PATCH | ✅ usuario | Actualizar mascota |

---

## Dispositivos

| Ruta | Método | Auth | Descripción |
|---|---|---|---|
| `/api/devices` | GET | ✅ usuario | Lista de KPCL del usuario |
| `/api/devices` | POST | ✅ usuario | Registrar nuevo KPCL |
| `/api/devices/[id]` | PATCH | ✅ usuario | Actualizar nombre/configuración |
| `/api/devices/[id]/tare` | POST | ✅ usuario | Insertar comando TARE en `device_commands` |
| `/api/devices/[id]/interval` | POST | ✅ usuario | Cambiar intervalo de publicación |
| `/api/devices/[id]/wifi` | POST | ✅ usuario | Agregar/remover red WiFi |
| `/api/devices/[id]/sessions` | GET | ✅ usuario | Sesiones de alimentación del dispositivo (`device_bowl_sessions`) |
| `/api/devices/category` | GET | ✅ usuario | Eventos categorizados (`audit_events`) |
| `/api/devices/events` | GET | ✅ usuario | Log de eventos del dispositivo |

> ⚠️ `/api/devices/tare` (sin ID) **no existe** — usar siempre `/api/devices/[id]/tare`.

---

## Lecturas y analytics

| Ruta | Método | Auth | Descripción |
|---|---|---|---|
| `/api/readings` | GET | ✅ usuario | Lecturas paginadas (query: `device_id`, `from`, `to`, `limit`) |
| `/api/readings/bucketed` | GET | ✅ usuario | Lecturas agrupadas en buckets de N segundos para gráficos |
| `/api/analytics/sessions` | GET | ✅ usuario | Sesiones de alimentación/hidratación |
| `/api/analytics/daily` | GET | ✅ usuario | Resumen diario desde analytics DB |

> ⚠️ `/api/readings/today` **no existe** — usar `/api/readings` con parámetros `from`/`to`.

---

## Bridge e infraestructura

| Ruta | Método | Auth | Descripción |
|---|---|---|---|
| `/api/mqtt/webhook` | POST | token secreto | Ingesta histórica de datos IoT (bridge v2 — legacy) |
| `/api/bridge/heartbeat` | POST | `BRIDGE_HEARTBEAT_SECRET` | Heartbeat del bridge Raspberry cada 60 s |
| `/api/bridge/health-check` | GET | ✅ admin | Estado en vivo del bridge |

---

## Admin

| Ruta | Método | Auth | Descripción |
|---|---|---|---|
| `/api/admin/overview` | GET | ✅ admin | Panel resumen: dispositivos, usuarios, finanzas |
| `/api/admin/finance/kpcl-catalog` | GET | ✅ admin | Perfiles de manufactura KPCL |
| `/api/admin/demo-ingresos` | GET/POST | ✅ admin | Leads de demos comerciales |
| `/api/admin/access` | GET/POST | ✅ admin | Control de acceso y roles admin |
| `/api/admin/tests` | GET | ✅ admin | Suite de tests internos de la API |
| `/api/admin/tests/run-all` | POST | ✅ admin | Ejecutar todos los tests de la API |

> ⚠️ `/api/admin/finance` (base sin sub-ruta) **no existe** — solo `/api/admin/finance/kpcl-catalog`.  
> ⚠️ `/api/admin/analytics` **no existe** como ruta — las sesiones están en `/api/devices/[id]/sessions`.

---

## Flujo de registro de dispositivo

```
POST /api/devices
  → Crea registro en `devices`
  → Llama RPC `link_device_to_pet` (asocia KPCL con mascota + pet_state)
  → Responde con device_id asignado
```

---

## Ver también

- [[03_Backend/README_Backend]] — implementación y módulos
- [[06_BaseDatos/README_BaseDatos]] — tablas que los endpoints leen/escriben
- [[04_Frontend/README_Frontend]] — quién consume esta API
