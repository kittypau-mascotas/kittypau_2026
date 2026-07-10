# Auditoria de Tablas — Base de Datos Kittypau

Fecha de corte: 2026-06-24

Este documento es el inventario canonico de todas las tablas de la base de datos principal (Supabase publica).
No incluye la base de analytics separada (`supabase-analytics`), que tiene su propio esquema.

---

## Criterio de clasificacion

| Estado | Significado |
|---|---|
| **activa** | Leida y/o escrita por codigo en produccion (app web, bridge, webhooks) |
| **admin** | Solo usada por rutas admin (no flujo de usuario final) |
| **compat** | Capa de compatibilidad heredada: se escribe pero nadie la lee en la app |
| **dormida** | Existe en el schema pero no tiene uso en runtime (sin inserts ni selects desde el codigo) |
| **infraestructura** | Infraestructura preparada para funcionalidad futura — no tiene uso actual en runtime |
| **vista** | View de Postgres (no tabla) — existe para consultas de admin/bridge |

---

## Tablas del core del producto

| Tabla | Estado | Quien la usa | Notas |
|---|---|---|---|
| `profiles` | **activa** | API profiles, registro, analytics, admin overview | 1:1 con auth.users |
| `pets` | **activa** | API pets, registro, admin overview | FK a profiles |
| `devices` | **activa** | API devices, webhook, bridge, lecturas | FK a profiles + pets |
| `readings` | **activa** | API readings, webhook, bridge, bowl, today | Tabla principal de telemetria IoT. ~10s por lectura por KPCL activo |
| `audit_events` | **activa** | `_audit.ts`, devices/category, devices/events, bridge, admin | Log de eventos de sistema y usuario |

---

## Tablas de monitoreo del bridge

| Tabla | Estado | Quien la usa | Notas |
|---|---|---|---|
| `bridge_heartbeats` | **activa** | bridge/heartbeat route, bridge/health-check, bridge index.js | Upsert cada 60s desde Raspberry. Clave para saber si el bridge esta vivo |
| `bridge_telemetry` | **activa** | bridge/heartbeat route, bridge/health-check | Historial de telemetria del bridge (RAM, disco, CPU, uptime) |
| `bridge_status_live` | **vista** | admin, health-check | View que une bridge_heartbeats + ultima bridge_telemetry |

---

## Tabla de comandos a dispositivos

| Tabla | Estado | Quien la usa | Notas |
|---|---|---|---|
| `device_commands` | **activa** | devices/tare, devices/interval, devices/wifi, bridge index.js | El bridge consulta comandos pendientes y los ejecuta via MQTT. El ciclo es: app inserta → bridge lee y ejecuta → bridge marca `executed` |

---

## Tablas de control de acceso y demos

| Tabla | Estado | Quien la usa | Notas |
|---|---|---|---|
| `admin_roles` | **activa** | API admin (todos los endpoints admin) | RBAC para acceso admin |
| `demo_ingresos_leads` | **admin** | admin/demo-ingresos route | Registro de leads desde demos comerciales |

---

## Tablas financieras (admin-only)

Usadas exclusivamente por rutas de admin. No afectan el flujo del usuario final.

| Tabla | Estado | Quien la usa | Notas |
|---|---|---|---|
| `finance_kit_components` | **admin** | admin/finance routes, admin overview | BOM — catalogo de componentes y costos unitarios |
| `finance_provider_plans` | **admin** | admin overview | Costos de proveedores cloud (Supabase, Vercel, HiveMQ, etc.) |
| `finance_monthly_snapshots` | **admin** | admin overview | Snapshot mensual de costos totales y por unidad |
| `finance_kpcl_profiles` | **admin** | admin/finance/kpcl-catalog | Perfiles de manufactura por modelo KPCL (impresion 3D, ensamblado) |
| `finance_kpcl_profile_components` | **admin** | admin/finance/kpcl-catalog | Componentes por perfil KPCL |
| `finance_purchases` | **admin** | (admin finance) | Historial real de compras de componentes (AliExpress, etc.) |

---

## Tablas de raza (dormidas)

| Tabla | Estado | Quien la usa | Notas |
|---|---|---|---|
| `breeds` | **dormida** | — | Catalogo de razas. Existe en el schema pero ningun endpoint la lee ni escribe. El frontend usa una lista hardcodeada. La infraestructura esta lista para activarse si el flujo de registro adopta seleccion de raza desde DB. |
| `pet_breeds` | **dormida** | — | Junction table pet ↔ breed. Dormida junto con `breeds`. FK a pets + breeds correctamente definida. |

**Accion recomendada:** No borrar. Activar cuando el flujo de seleccion de raza migre de lista hardcodeada a DB.

---

## Tabla de compatibilidad heredada (compat)

| Tabla | Estado | Quien la usa | Notas |
|---|---|---|---|
| `sensor_readings` | **compat / retirada** | — | Capa de compatibilidad del bridge v2.4 (device_id TEXT). Fue retirada en bridge v3.2 (2026-04-27): ninguna app la lee ni la va a leer. La escritura desde el bridge fue eliminada. La tabla existe en la DB pero ya no recibe nuevas filas. Candidata a `DROP TABLE` en una migration futura cuando se confirme que el historial no es necesario. |

**Pendiente:** Migrar `DROP TABLE public.sensor_readings` cuando se confirme que el historial acumulado no es necesario para diagnosticos pasados.

---

## Sesiones de comedero (desde audit_events)

| Tabla | Estado | Quien la usa | Notas |
|---|---|---|---|
| `device_bowl_sessions` | **activa** | admin/analytics, investigacion | Sesiones materializadas desde `audit_events` (inicio_* → termino_*). Tipos: `alimentacion`, `servido`, `hidratacion`. Incluye duración, gramos netos y flag `is_valid`. Agregada en migración 2026-04-27. |

---

## Infraestructura de bateria

Creadas en marzo 2026. El firmware ESP8266 v2.0.0 ya emite `battery_level`, `battery_voltage`, `battery_state` y `battery_source` reales desde el ADC — las tablas están listas para activarse.

| Tabla | Estado | Notas |
|---|---|---|
| `device_operation_records` | **infraestructura** | Ventanas de tiempo activo por KPCL. Sin código activo en runtime (app/bridge no escribe). |
| `device_battery_cycles` | **infraestructura** | Ciclos de carga/descarga. Los valores `charging` / `charged` / `battery_only` ya están permitidos en `readings` (migración 2026-04-28). |
| `device_power_sessions` | **infraestructura** | Sesiones de encendido/apagado por gaps de lecturas. Sin código activo. |

**Accion recomendada:** No borrar. Cuando se active el pipeline de battery analytics, el bridge puede empezar a poblar estas tablas sin cambios de schema.

---

## Views y funciones RPC existentes

| Nombre | Tipo | Uso |
|---|---|---|
| `latest_readings` | view | Bridge compatibility — ultima lectura por device |
| `device_summary` | view | Admin — device + pet + ultima lectura combinados |
| `bridge_status_live` | view | Admin health-check — estado en vivo del bridge |
| `update_device_from_reading` | trigger function | Actualiza `devices.last_seen` y `devices.battery_level` despues de cada INSERT en readings |
| `link_device_to_pet` | rpc function | Registro atomico de dispositivo + actualizacion de pet_state |
| `get_readings_bucketed` | rpc function | Lecturas agrupadas en buckets de N segundos para graficos de largo plazo |

---

## Base de datos de analytics (proyecto separado)

El proyecto `supabase-analytics` es una instancia Supabase separada. Sus tablas principales:

| Tabla | Estado | Quien la usa |
|---|---|---|
| `pet_sessions` | **activa** | bridge/processor.js (INSERT), api/analytics/sessions (SELECT) |
| `pet_daily_summary` | **activa** | bridge/processor.js (INSERT/UPDATE), api/analytics/daily (SELECT) |

Credenciales en `.env.local` como `SUPABASE_ANALYTICS_URL` y `SUPABASE_ANALYTICS_KEY`. Si no existen, la capa de analytics degrada a `data: []` sin romper el build.

---

## Historial de cambios aplicados

### 2026-04-27
1. **Bridge v3.1 → v3.2**: Eliminada la escritura a `sensor_readings`. La tabla `readings` (UUID-based) es la única tabla de telemetría activa.
2. **Migración** `add_device_bowl_sessions_from_audit_events`: nueva tabla `device_bowl_sessions`.

### 2026-04-28
3. **Migración** `add_battery_state_charging_charged`: amplía constraint `readings_battery_state_check` para incluir `battery_only`, `charged` (compatibles con firmware v2.0.0).

### 2026-05-24
4. **Migración** `fix_link_device_to_pet_ambiguity`: elimina las dos sobrecargas de `link_device_to_pet` y deja una única versión canónica que usa `p_device_id` (texto KPCL), resolviendo error de resolución de parámetros nombrados en `route.ts`.

---

## Pendientes de migracion (no urgentes)

```sql
-- Candidato a ejecutar cuando se confirme que el historial de sensor_readings no es necesario:
-- DROP TABLE IF EXISTS public.sensor_readings;
```

No ejecutar sin revisar primero si hay datos historicos utiles en la tabla.

---

## Regla de uso de este documento

- Si se agrega una tabla nueva, agregarla aqui con su estado y quien la usa.
- Si una tabla pasa de dormida a activa (o viceversa), actualizar este documento.
- Si se hace un DROP TABLE, registrarlo aqui con fecha y razon.
- Este documento NO reemplaza las migraciones SQL — es un inventario para lectura rapida.
