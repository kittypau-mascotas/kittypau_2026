---
id: readme_proyecto
title: Kittypau — Fuente de Verdad del Proyecto
type: architecture
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - proyecto
  - fuente-de-verdad
  - tablas
  - vocabulario
related:
  - [[00_HOME]]
  - [[02_Arquitectura/README_Arquitectura]]
  - [[01_Proyecto/ESTADO_ACTUAL]]
  - [[06_BaseDatos/README_BaseDatos]]
---

# Kittypau — Fuente de Verdad del Proyecto

> Si un documento entra en conflicto con este, este gana hasta que la fuente se actualice.

---

## 1. Qué está activo

- `kittypau_app/` — app web/nativa principal (Next.js 16.1.6 + Capacitor 8.2.0)
- `bridge/` — puente MQTT → Supabase v3.2 (Node.js en Raspberry Pi Zero 2W)
- `supabase/` — esquema, 55 migraciones, funciones y tablas activas
- `iot_firmware/` — firmware ESP8266 v2.0.0 (KPCL food bowl)
- `Knowledge/` — vault de documentación (este sistema)
- `.github/` y `.husky/` — automatización y calidad

Para el snapshot completo del estado actual, ver [[01_Proyecto/ESTADO_ACTUAL]].

---

## 2. Qué es legacy o está archivado

- `Analisis_Estadistico_ML_IA/` — workspace de análisis, ignorado en producción
- `kittypau_2026/` — snapshot histórico
- `supabase-analytics/` — esquema analítico histórico (**no** es la fuente activa del producto)
- `boton gato/`, `cat-movement-lab/`, `samsung_tizen_experiment/` — experimentos laterales
- `tools/` y `Test Graficos/` — trabajo local / utilidades no productivas
- `kittypau_app/legacy/` — residuos locales antiguos
- `notebooks/` — placeholder documental local (no forma parte del runtime de la app)

---

## 3. Tablas oficiales en Supabase

### Core

| Tabla | Propósito |
|-------|-----------|
| `public.profiles` | Usuarios registrados |
| `public.pets` | Mascotas |
| `public.devices` | Dispositivos KPCL |
| `public.readings` | Lecturas de sensores (ingesta MQTT) |
| `public.bridge_heartbeats` | Health check del bridge Raspberry |
| `public.bridge_telemetry` | Telemetría del bridge |
| `public.audit_events` | Observaciones manuales inmutables de estado puntual |

### Operación del dispositivo

| Tabla | Propósito |
|-------|-----------|
| `public.device_operation_records` | Periodos de funcionamiento |
| `public.device_power_sessions` | Seguimiento ON/OFF por actividad |
| `public.device_battery_cycles` | Ciclos de batería (cuando exista telemetría `battery_*`) |

> `public.audit_events` también se usa para: tares manuales del plato, baselines puntuales de
> alimento, lecturas netas sucesivas, y secuencias manuales de tare/llenado, hasta que exista
> una tabla snapshot específica para plato/dispositivo.

### Finanzas y BOM

| Tabla | Propósito |
|-------|-----------|
| `public.finance_purchases` | Compras |
| `public.finance_kit_components` | Componentes por kit |
| `public.finance_provider_plans` | Planes de proveedores |
| `public.finance_monthly_snapshots` | Snapshots mensuales de costos |
| `public.finance_admin_summary` | Resumen admin |
| `public.finance_kpcl_profiles` | Perfiles de dispositivo KPCL |
| `public.finance_kpcl_profile_components` | Componentes por perfil KPCL |

---

## 4. Flujos soportados

- Registro de usuario, mascota y dispositivo
- Enlace dispositivo → mascota
- Ingesta MQTT → bridge → webhook → `public.readings`
- Seguimiento ON/OFF por actividad con `public.device_power_sessions`
- Registro de períodos de funcionamiento en `public.device_operation_records`
- Ciclos de batería en `public.device_battery_cycles`
- Observaciones manuales puntuales en `public.audit_events`
- Inventario y costos de componentes / perfiles KPCL
- Pruebas controladas de peso y carga para KPCL0034 y KPCL0036

---

## 5. Lo que NO se debe asumir

- `supabase-analytics` no es la fuente activa del producto
- `battery_state`, `battery_source` y `battery_voltage` no existen en el histórico de KPCL0034 todavía
- La duración real de batería no se puede inferir sin telemetría de energía
- `notebooks/` no forma parte del runtime de la app
- `/api/readings/today` **no existe** — usar `/api/readings?from=X&to=Y`
- `/api/devices/tare` (sin ID) **no existe** — siempre usar `/api/devices/[id]/tare`
- `/api/admin/analytics` **no existe** — las sesiones están en `/api/devices/[id]/sessions`
- Las variables MQTT del browser son `NEXT_PUBLIC_MQTT_BROKER/PORT_WS/USER_READONLY/PASS_READONLY` — **no** `NEXT_PUBLIC_HIVEMQ_*`
- El estado vivo resumido del proyecto vive en [[01_Proyecto/ESTADO_ACTUAL]]

---

## 6. Vocabulario canónico

| Término | Definición |
|---------|-----------|
| `activo` | Componente, doc o flujo en uso dentro del producto vigente |
| `legacy` | Componente o referencia antigua que puede seguir existiendo por compatibilidad |
| `archive` | Documento o artefacto histórico que se conserva solo como referencia |
| `ON/OFF` | Estado operativo inferido por actividad de lecturas |
| `power session` | Período continuo de actividad detectada por lecturas |
| `battery cycle` | Período de carga o uso con batería, cuando exista telemetría de energía |
| `battery state` | Campo de telemetría esperado (`charging`, `battery_only`, etc.) |
| `battery source` | Fuente de energía detectada (`external_power`, `battery`, etc.) |

---

## 7. Orden de lectura recomendado

1. [[02_Arquitectura/README_Arquitectura]]
2. [[01_Proyecto/README_Proyecto]] ← este doc
3. [[01_Proyecto/ESTADO_ACTUAL]]
4. [[06_BaseDatos/README_BaseDatos]]
5. [[05_API/README_API]]
6. [[09_Sensores/README_Sensores]]

---

## Ver también

- [[02_Arquitectura/README_Arquitectura]]
- [[06_BaseDatos/README_BaseDatos]]
- [[23_Decisiones/MOC_ADR]]
