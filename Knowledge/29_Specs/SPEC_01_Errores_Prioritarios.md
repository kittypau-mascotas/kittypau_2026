---
id: spec_01_errores_prioritarios
title: SPEC 01 — Errores prioritarios
type: spec
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-14
tags:
  - spec
  - bugs
  - deuda-tecnica
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[AUDITORIA_2026_08_11]]
  - [[01_Proyecto/ESTADO_ACTUAL]]
  - [[29_Specs/SPEC_12_Recrear_Analytics_DB]]
---

# SPEC 01 — Errores prioritarios

> Backlog vivo — los items ya resueltos se sacan de este doc en cuanto se implementan (ver
> commits en `git log` para el historial). Solo quedan acá los que siguen pendientes.

---

### E2 — ✅ Resuelto (2026-08-15)

`admin_roles` estaba vacía por la misma causa raíz diagnosticada (migración original
buscaba un email que nunca se registró, `javomauro.contacto@gmail.com`). Aplicado vía
`SUPABASE_SERVICE_ROLE_KEY` + migraciones nuevas
(`20260815151938_seed_owner_admin_javier_dayne.sql`,
`20260815152500_replace_admin_role_javomauro.sql`): a pedido de Mauro, la cuenta admin real
quedó siendo **`javomauro.contacto@gmail.com`** (creada en esta sesión, `owner_admin`
activo) — **no** `javier.dayne@gmail.com`, que queda con `admin_roles.active=false`
(desactivado, no borrado — reversible). Verificado antes/después contra la tabla.

---

### E8 — ✅ Resuelto (2026-08-15)

Causa raíz confirmada exactamente como se sospechaba: la migración de abril
(`20260427190500_add_device_bowl_sessions_from_audit_events.sql`) nunca se aplicó de
verdad — `create table if not exists` encontró una tabla vieja con ese nombre (schema
simple: `device_id`, `pet_id`, `session_type`, `started_at`, `ended_at`,
`duration_seconds`, `start_weight_grams`, `end_weight_grams`, `consumed_grams`), la dejó
intacta, y todo lo que venía después en la misma migración (índices sobre `device_uuid`,
que no existía) rompió en cadena — **ni `device_bowl_session_anomalies`, ni las 2
funciones, ni la vista `device_bowl_sessions_today` habían llegado a crearse nunca**.

**Fix aplicado** (`DATABASE_URL`, vía `psycopg2` — mismo mecanismo que ya usó SPEC_08):
`DROP TABLE` de la tabla vieja (0 filas, sin pérdida de datos) + reaplicar la migración
completa del repo tal cual, en una sola transacción. Verificado después: las 18 columnas
del schema nuevo existen, `device_bowl_session_anomalies` existe (0 filas), las 2 funciones
existen, la vista existe, y `rebuild_device_bowl_sessions(null,null)` corrió sin error
(0 sesiones reconstruidas — correcto, no hay ningún `audit_events` de tipo
`manual_bowl_category` todavía, nadie usó esa feature de etiquetado manual).

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
