---
id: spec_01_errores_prioritarios
title: SPEC 01 — Errores prioritarios
type: spec
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - spec
  - bugs
  - deuda-tecnica
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[AUDITORIA_2026_08_11]]
  - [[01_Proyecto/ESTADO_ACTUAL]]
---

# SPEC 01 — Errores prioritarios

> Backlog vivo — los items ya resueltos se sacan de este doc en cuanto se implementan (ver
> commits en `git log` para el historial). Solo quedan acá los que siguen pendientes.

---

### E2 — `/admin` (root) no deja entrar a ninguna cuenta de prueba

Tanto la cuenta tester como la cuenta que debería tener rol admin terminan redirigidas a
`/today` al navegar a `/admin`. Sin embargo `/admin/javo` y `/admin/demo-ingresos` sí cargan
directo por URL.

**Dos hipótesis, no descartadas:**
1. La fila de `admin_roles` para la cuenta admin de prueba no existe en este proyecto de
   Supabase (problema de datos, no de código).
2. El gate de `/admin` root usa una condición distinta (más estricta) que las subrutas —
   revisar si `/admin/page.tsx` valida contra `admin_roles` con una query distinta a la que
   usan `/admin/javo` y `/admin/demo-ingresos` (o si esas 2 en realidad no tienen gate propio
   y dependen solo de estar autenticado).

**Fix:** confirmar primero contra la tabla `admin_roles` en Supabase (hipótesis 1, gratis de
revisar). Si la fila existe y el bug persiste, es un bug real de routing — comparar el
guard de `/admin/page.tsx` contra el de las subrutas. **Bloqueado**: requiere acceso directo
a Supabase que no está disponible en sesión de código.

**Esfuerzo:** S (una vez identificada la causa). **Impacto:** Alto — sin esto, nadie puede
QA-ear el dashboard admin real.

---

### E7 — Variables MQTT y `BRIDGE_HEARTBEAT_SECRET` ausentes en `.env.local`

`.env.local` de desarrollo no tiene `NEXT_PUBLIC_MQTT_BROKER`, `NEXT_PUBLIC_MQTT_PORT_WS`,
`NEXT_PUBLIC_MQTT_USER_READONLY`, `NEXT_PUBLIC_MQTT_PASS_READONLY`, ni
`BRIDGE_HEARTBEAT_SECRET`. Esto es lo que causa la degradación observada en `/bowl` y
`/today` (ver [[18_UI/README_UI]]) — la app degrada bien (con avisos, sin romperse), pero
bloquea probar el flujo MQTT en vivo en desarrollo local.

**Fix:** agregar las 5 variables al `.env.local` de desarrollo (pedir los valores reales a
quien tenga acceso al broker HiveMQ y al secreto compartido con la Raspberry). **Bloqueado**:
requiere los secretos reales, no disponibles en sesión de código.

**Esfuerzo:** XS (una vez con los valores). **Impacto:** Alto para poder desarrollar/probar
`/bowl` y los heartbeats del bridge localmente.

---

## Nota permanente — no es una tarea, es una precaución

**`readings.csv` / `readings_rows.csv` son más grandes de lo que dice el resto de la
documentación** (ver [[10_Datasets/README_Datasets]]). No es un bug — los scripts de
`fase_0_ruido/` ya filtran bien por UUID — pero cualquier código nuevo que asuma "son pocas
filas de un solo device" y cargue el CSV entero sin filtrar primero va a fallar o ser
lentísimo. Filtrar por `device_id` en el query/read, siempre.

---

## Ver también

- [[AUDITORIA_2026_08_11]] — metodología y hallazgos completos
- [[29_Specs/SPEC_02_UIUX_Mejoras]] — mejoras de UX que no son "errores" sino calidad
- [[01_Proyecto/ESTADO_ACTUAL]] — deuda técnica general del proyecto
