---
id: readme_basedatos
title: Base de Datos — Supabase PostgreSQL
type: backend
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-14
tags:
  - supabase
  - postgresql
  - schema
  - tablas
related:
  - [[00_HOME]]
  - [[02_Arquitectura/README_Arquitectura]]
  - [[02_Arquitectura/ARQ_Pipeline_End_to_End]]
  - [[03_Backend/README_Backend]]
  - [[07_MQTT/README_MQTT]]
  - [[23_Decisiones/ADR_002_Supabase]]
  - [[29_Specs/SPEC_01_Errores_Prioritarios]]
  - [[29_Specs/SPEC_12_Recrear_Analytics_DB]]
---

# Base de Datos — Supabase PostgreSQL

> Inventario canónico de tablas. Corte original: 2026-06-29, **re-verificado en vivo
> 2026-08-14** contra el schema real (introspección directa vía OpenAPI de PostgREST, no
> solo migraciones) — ver [[02_Arquitectura/ARQ_Pipeline_End_to_End]] §3.1 para el método.
> El proyecto principal tiene **29 tablas hoy**; las que no estaban en el corte de junio se
> listan en una sección nueva al final, sin auditar en detalle todavía (solo nombre +
> columnas, confirmar "quién la usa" antes de asumir).

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
| `admin_roles` | 🔴 **vacía** (verificado 2026-08-14) | RBAC para acceso admin — la migración semilla apunta a un email que nunca se registró, nadie tiene rol admin hoy. Ver [[29_Specs/SPEC_01_Errores_Prioritarios]] E2 |
| `demo_ingresos` | **admin** | Registro de leads desde demos comerciales — nombre corregido 2026-08-14, la tabla real es `demo_ingresos` (sin `_leads`) |
| `admin_dashboard_live` | Sin auditar (nueva desde el corte de junio) | Nombre sugiere vista/tabla materializada para el dashboard admin — no confirmado quién la usa |
| `admin_object_stats_live` | Sin auditar (nueva desde el corte de junio) | Ídem — ver `supabase/migrations/2026021920*_admin_object_stats_*.sql` |

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
| `finance_purchases_summary` | Sin auditar (nueva desde el corte de junio) | Nombre sugiere agregación de `finance_purchases` — no confirmado si es vista o tabla |
| `finance_admin_summary` | Sin auditar (nueva desde el corte de junio) | Nombre sugiere resumen financiero para `/admin` — no confirmado |

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
| `sensor_readings` | ⚠️ **sigue activa en producción** (corregido 2026-08-14) | El repo git dice v3.2 "elimina escritura a `sensor_readings`" — pero el bridge **realmente desplegado** en la Raspberry es v3.1 (SSH directo lo confirmó, ver [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §-1) y **sigue escribiendo ahí en cada `SENSORS`**. No es candidata a `DROP TABLE` hasta que el deploy real se actualice. |

---

## Sesiones de comedero

| Tabla | Estado | Notas |
|---|---|---|
| `device_bowl_sessions` | 🔴 **rota** (verificado 2026-08-14) | El schema **real en producción** no coincide con la migración `20260427190500` (columnas `device_id`/`started_at`/`start_weight_grams` en vez de `device_uuid`/`session_start_at`/`start_content_grams`) — probable `CREATE TABLE IF NOT EXISTS` que nunca corrió porque ya existía una tabla más simple con ese nombre. `GET /api/devices/[id]/sessions` devuelve 500 (`column ... does not exist`), confirmado con query directa. 0 filas — nunca funcionó. Ver [[29_Specs/SPEC_01_Errores_Prioritarios]] E8. |
| `device_bowl_session_anomalies` | Sin re-verificar 2026-08-14 | Anomalías detectadas dentro de sesiones de bowl. Creada en la misma migración que `device_bowl_sessions` — probablemente tiene el mismo problema de drift, no confirmado en esta pasada. |

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
| `device_operation_records` | ⚠️ **no encontrada en el schema real** (verificado 2026-08-14) | Esta tabla **no aparece** en la introspección en vivo del proyecto — o se eliminó, o la migración que la crea nunca corrió (mismo patrón de drift que `device_bowl_sessions` arriba). No confirmado cuál de los dos. |
| `device_battery_cycles` | **infraestructura**, 5 filas hoy | Ciclos de carga/descarga. Schema listo desde migración 2026-04-28, tiene algo de datos reales. |
| `device_power_sessions` | **infraestructura**, 70 filas hoy | Sesiones de encendido/apagado — tiene datos reales pese a "sin código activo" del corte de junio, revisar si algo la está usando ahora. |
| `device_battery_charge_assumptions` | Sin auditar (nueva desde el corte de junio) | Nombre sugiere supuestos de modelado de carga — no confirmado |

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

## Base de datos analytics (instancia separada) — 🔴 eliminada

> **Actualizado 2026-08-14:** el proyecto `kittypau-analytics` (ref `spfonxnyprjqxcxaqsbe`)
> fue **eliminado a propósito** (consumía mucho storage en el plan Free, confirmado por
> Mauro) — ya no existe, ni pausado ni activo. `pet_sessions`/`pet_daily_summary` no
> sobrevivieron en ningún otro lado (confirmado: tampoco están en el proyecto principal).
> **La nota de "degrada a `data: []`" de abajo es engañosa en el estado actual**: el código
> solo chequea que las env vars *estén seteadas* (lo están, en `.env.local`), no que el host
> responda — con el proyecto eliminado, `GET /api/analytics/daily` y `.../sessions`
> devuelven **500**, no `[]`. Detalle completo, cómo se descubrió, y el plan para recrearlo
> (schema exacto + regla de cuenta Supabase separada) en
> [[02_Arquitectura/ARQ_Pipeline_End_to_End]] §3.2 y [[29_Specs/SPEC_12_Recrear_Analytics_DB]].

| Tabla | Estado | Quién la usaba |
|---|---|---|
| `pet_sessions` | 🔴 DB eliminada | `bridge/processor.js` (INSERT), `api/analytics/sessions` (SELECT) |
| `pet_daily_summary` | 🔴 DB eliminada | `bridge/processor.js` (INSERT/UPDATE), `api/analytics/daily` (SELECT) |

---

## Otras tablas nuevas desde el corte de junio (sin auditar en detalle)

| Tabla | Notas |
|---|---|
| `knowledge_embeddings` | Probable soporte del RAG de la app de usuarios finales (ver nota de CLAUDE.md: "El RAG en Supabase es para la app de usuarios finales, no para sesiones Claude") — no confirmado el pipeline que la llena |

---

## Historial de migraciones clave

| Fecha | Cambio |
|---|---|
| 2026-04-27 | Bridge v3.2 (**en el repo git — no en producción, ver nota arriba**): elimina escritura a `sensor_readings`; nueva tabla `device_bowl_sessions` (⚠️ el `CREATE TABLE` de esta migración no llegó a aplicarse tal cual — ver arriba, E8) |
| 2026-04-28 | Amplía constraint `battery_state` para incluir `battery_only`, `charged` (firmware v2.0.0) |
| 2026-05-24 | `fix_link_device_to_pet_ambiguity`: una única versión canónica de la función RPC |
| 2026-08-14 | Auditoría en vivo (no solo migraciones): confirma `admin_roles` vacía, `device_bowl_sessions` con drift de schema, `device_operation_records` no encontrada, DB de analytics eliminada — ver [[02_Arquitectura/ARQ_Pipeline_End_to_End]] |

---

## Ver también

- [[02_Arquitectura/ARQ_Pipeline_End_to_End]] — mapa de integración con las 6 capas, incluye los hallazgos de 2026-08-14 de este doc
- [[29_Specs/SPEC_01_Errores_Prioritarios]] — E2 (`admin_roles`), E8 (`device_bowl_sessions`)
- [[29_Specs/SPEC_12_Recrear_Analytics_DB]] — plan para recrear la DB de analytics eliminada
- [[23_Decisiones/ADR_002_Supabase]] — decisión de usar Supabase
- [[07_MQTT/README_MQTT]] — bridge que escribe en estas tablas
- [[10_Datasets/README_Datasets]] — CSVs locales (distintos de Supabase)
