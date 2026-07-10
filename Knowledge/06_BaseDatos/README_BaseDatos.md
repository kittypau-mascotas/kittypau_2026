---
id: readme_basedatos
title: Base de Datos — Supabase PostgreSQL
type: backend
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - supabase
  - postgresql
  - schema
  - tablas
related:
  - [[00_HOME]]
  - [[02_Arquitectura/README_Arquitectura]]
  - [[03_Backend/README_Backend]]
  - [[07_MQTT/README_MQTT]]
  - [[23_Decisiones/ADR_002_Supabase]]
---

# Base de Datos — Supabase PostgreSQL

> Inventario canónico de tablas. Corte: 2026-06-29.  
> No incluye la instancia `supabase-analytics` (proyecto separado).  
> Basado en 55 migraciones (2026-02-08 → 2026-05-24) verificadas contra el código del bridge.

---

## Criterios de estado

| Estado | Significado |
|---|---|
| **activa** | Leída y/o escrita por código en producción |
| **admin** | Solo usada por rutas admin (no flujo de usuario final) |
| **compat** | Capa de compatibilidad heredada — se escribía pero nadie la lee |
| **dormida** | Existe en el schema pero sin uso en runtime |
| **infraestructura** | Preparada para funcionalidad futura — sin uso actual |
| **vista** | View de Postgres — solo para consultas de admin/bridge |

---

## Tablas del core del producto

| Tabla | Estado | Quién la usa | Notas |
|---|---|---|---|
| `profiles` | **activa** | API profiles, registro, analytics, admin overview | 1:1 con `auth.users` |
| `pets` | **activa** | API pets, registro, admin overview | FK a `profiles` |
| `devices` | **activa** | API devices, webhook, bridge, lecturas | FK a `profiles` + `pets` |
| `readings` | **activa** | API readings, webhook, bridge, bowl, today | Tabla principal telemetría IoT — ~10 s por lectura por KPCL activo |
| `audit_events` | **activa** | `_audit.ts`, devices/category, devices/events, bridge, admin | Log de eventos de sistema y usuario |

---

## Tablas de monitoreo del bridge

| Tabla | Estado | Quién la usa | Notas |
|---|---|---|---|
| `bridge_heartbeats` | **activa** | bridge/heartbeat route, bridge/health-check | Upsert cada 60 s desde Raspberry |
| `bridge_telemetry` | **activa** | bridge/heartbeat route, bridge/health-check | Historial RAM, disco, CPU, uptime |
| `bridge_status_live` | **vista** | admin, health-check | Une `bridge_heartbeats` + última `bridge_telemetry` |

---

## Tabla de comandos a dispositivos

| Tabla | Estado | Quién la usa | Notas |
|---|---|---|---|
| `device_commands` | **activa** | devices/tare, devices/interval, devices/wifi, bridge | Bridge consulta pendientes y ejecuta vía MQTT. Ciclo: app inserta → bridge lee y ejecuta → bridge marca `executed` |

---

## Tablas de control de acceso

| Tabla | Estado | Notas |
|---|---|---|
| `admin_roles` | **activa** | RBAC para acceso admin |
| `demo_ingresos_leads` | **admin** | Registro de leads desde demos comerciales |

---

## Tablas financieras (admin-only)

| Tabla | Estado | Notas |
|---|---|---|
| `finance_kit_components` | **admin** | BOM — catálogo de componentes y costos unitarios |
| `finance_provider_plans` | **admin** | Costos de proveedores cloud (Supabase, Vercel, HiveMQ) |
| `finance_monthly_snapshots` | **admin** | Snapshot mensual de costos totales |
| `finance_kpcl_profiles` | **admin** | Perfiles de manufactura por modelo KPCL |
| `finance_kpcl_profile_components` | **admin** | Componentes por perfil KPCL |
| `finance_purchases` | **admin** | Historial de compras de componentes |

---

## Tablas de razas (dormidas)

| Tabla | Estado | Notas |
|---|---|---|
| `breeds` | **dormida** | Catálogo de razas — frontend usa lista hardcodeada. Lista para activar. |
| `pet_breeds` | **dormida** | Junction table pet ↔ breed. Dormida junto con `breeds`. |

---

## Tabla de compatibilidad heredada

| Tabla | Estado | Notas |
|---|---|---|
| `sensor_readings` | **compat/retirada** | Ya no recibe filas nuevas desde bridge v3.2. Candidata a `DROP TABLE`. |

---

## Sesiones de comedero

| Tabla | Estado | Notas |
|---|---|---|
| `device_bowl_sessions` | **activa** | Sesiones materializadas desde `audit_events`. Tipos: `alimentacion`, `servido`, `hidratacion`. Incluye duración, gramos netos y flag `is_valid`. |
| `device_bowl_session_anomalies` | **activa** | Anomalías detectadas dentro de sesiones de bowl. Creada en migración 2026-04-27 junto con `device_bowl_sessions`. |

### Views relacionadas con bowl

| Nombre | Tipo | Uso |
|---|---|---|
| `device_bowl_sessions_today` | view | Sesiones de hoy — usada en admin y página `/today` |

### Función relacionada con bowl

| Función | Tipo | Descripción |
|---|---|---|
| `resolve_event_content_grams` | rpc/función | Calcula gramos netos de contenido para un evento dado |

---

## Infraestructura de batería (inactiva)

| Tabla | Estado | Notas |
|---|---|---|
| `device_operation_records` | **infraestructura** | Ventanas de tiempo activo por KPCL. Sin código activo. |
| `device_battery_cycles` | **infraestructura** | Ciclos de carga/descarga. Schema listo desde migración 2026-04-28. |
| `device_power_sessions` | **infraestructura** | Sesiones de encendido/apagado. Sin código activo. |

---

## Views y funciones RPC

| Nombre | Tipo | Uso |
|---|---|---|
| `latest_readings` | view | Bridge compatibility — última lectura por device |
| `device_summary` | view | Admin — device + pet + última lectura |
| `bridge_status_live` | view | Admin health-check — estado en vivo del bridge |
| `update_device_from_reading` | trigger | Actualiza `devices.last_seen` y `battery_level` en cada INSERT en `readings` |
| `link_device_to_pet` | rpc | Registro atómico de dispositivo + actualización de `pet_state` |
| `get_readings_bucketed` | rpc | Lecturas agrupadas en buckets de N segundos para gráficos |

---

## Base de datos analytics (instancia separada)

Proyecto `supabase-analytics` — credenciales en `.env.local` como `SUPABASE_ANALYTICS_URL`.

| Tabla | Estado | Quién la usa |
|---|---|---|
| `pet_sessions` | **activa** | `bridge/processor.js` (INSERT), `api/analytics/sessions` (SELECT) |
| `pet_daily_summary` | **activa** | `bridge/processor.js` (INSERT/UPDATE), `api/analytics/daily` (SELECT) |

Si no existen las credenciales, la capa analytics degrada a `data: []` sin romper el build.

---

## Historial de migraciones clave

| Fecha | Cambio |
|---|---|
| 2026-04-27 | Bridge v3.2: elimina escritura a `sensor_readings`; nueva tabla `device_bowl_sessions` |
| 2026-04-28 | Amplía constraint `battery_state` para incluir `battery_only`, `charged` (firmware v2.0.0) |
| 2026-05-24 | `fix_link_device_to_pet_ambiguity`: una única versión canónica de la función RPC |

---

## Ver también

- [[23_Decisiones/ADR_002_Supabase]] — decisión de usar Supabase
- [[07_MQTT/README_MQTT]] — bridge que escribe en estas tablas
- [[10_Datasets/README_Datasets]] — CSVs locales (distintos de Supabase)
