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

### E2 — `/admin` (root) no deja entrar a ninguna cuenta de prueba

> ✅ **Causa raíz confirmada (2026-08-14)** — hipótesis 1 era correcta: `admin_roles` está
> **vacía** (verificado con `SUPABASE_SERVICE_ROLE_KEY`, ya disponible en `.env.local`). La
> migración `20260212080000_admin_roles_and_dashboard.sql` seedea el rol `owner_admin`
> dentro de un `do $$ ... $$` que busca `auth.users` por
> `email = 'javomauro.contacto@gmail.com'` — **ese email nunca se registró** (verificado
> contra los 10 usuarios reales de `auth.users`). El guard `if v_user_id is not null` hizo
> que el insert se saltara en silencio; la migración "corrió bien" pero no sembró nada. La
> cuenta admin documentada de verdad es `javier.dayne@gmail.com`
> (`f3346342-2b84-4116-aa6f-77ee7458914b`, existe desde 2026-03-10) — nunca recibió el rol.
>
> Hipótesis 2 descartada con evidencia directa, no solo por descarte: `admin/page.tsx`
> llama a `GET /api/admin/overview`, y ese route (línea 259-275) resuelve `isAdmin` como
> `Boolean(adminRole) || isAdminFallbackEmail(...)` — con `admin_roles` vacía y
> `isAdminFallbackEmail` matcheando solo el email inexistente (`ADMIN_EMAILS` tampoco está
> seteado en `.env.local`), la respuesta es siempre 403, y `admin/page.tsx:666` hace
> `router.replace("/today")` en ese caso exacto. Incluso `javier.dayne@gmail.com` (la cuenta
> admin/tester real) cae en esta rama. Mismo patrón repetido sin variación en los otros 6
> archivos que exportan rutas `/api/admin/*` (`tests/run-all`, `demo-ingresos`, `access`,
> `health-check`, `finance/kpcl-catalog`) — todos usan el mismo `isAdminFallbackEmail`
> importado de `_utils.ts`, así que el fix de una sola fila en `admin_roles` los desbloquea
> a todos a la vez, no solo a `/admin` root.
>
> **Fix listo, no aplicado todavía** (requiere confirmación explícita antes de escribir en
> `admin_roles` de producción, mismo criterio que ya se usó en
> [[29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos]] §4): nueva migración que inserte
> `(user_id='f3346342-2b84-4116-aa6f-77ee7458914b', role='owner_admin', active=true)` — no
> editar la migración ya aplicada, sumar una nueva.

**Esfuerzo:** XS (ya identificado, falta solo aplicar el insert). **Impacto:** Alto — sin
esto, nadie puede QA-ear el dashboard admin real.

---

### E8 — `GET /api/devices/[id]/sessions` está roto: `device_bowl_sessions` en producción no coincide con la migración del repo

> **Encontrado 2026-08-14** revisando si `pet_sessions`/`pet_daily_summary` (la DB de
> analytics eliminada, ver [[29_Specs/SPEC_12_Recrear_Analytics_DB]]) existían en algún otro
> lado — no es lo mismo, pero apareció en el camino. Confirmado con una query directa contra
> Supabase (`SUPABASE_SERVICE_ROLE_KEY`), no una suposición:
> ```
> {"code":"42703","message":"column device_bowl_sessions.device_uuid does not exist"}
> ```
> La tabla **real en producción** tiene columnas simples (`device_id`, `pet_id`,
> `session_type`, `started_at`, `ended_at`, `duration_seconds`, `start_weight_grams`,
> `end_weight_grams`, `consumed_grams`) — **no coincide** con
> `supabase/migrations/20260427190500_add_device_bowl_sessions_from_audit_events.sql`, que
> define `device_uuid`, `owner_id`, `session_start_at`, `start_content_grams`,
> `start_event_id`/`end_event_id` (FK a `audit_events`), etc.
>
> **Causa raíz probable:** ese `create table if not exists public.device_bowl_sessions`
> nunca corrió de verdad — ya existía una tabla más simple con ese nombre (de un intento
> anterior, creada fuera de este archivo de migración) y `IF NOT EXISTS` la dejó intacta en
> silencio, sin error. La función `rebuild_device_bowl_sessions()` y
> `api/devices/[id]/sessions/route.ts` sí se actualizaron para el diseño nuevo (columnas que
> no existen) — de ahí el error. Confirma la teoría: la tabla tiene **0 filas** — nunca
> funcionó, nadie lo notó.
>
> **No confundir con SPEC_12** (la DB de analytics separada, `pet_sessions`) — esto es una
> tabla distinta, en el proyecto principal, para una feature manual/distinta (sesiones
> derivadas de `audit_events` tageadas a mano, no del pipeline automático del bridge).
>
> **Fix, no aplicado todavía** (dos caminos, a decidir):
> 1. Correr una migración nueva que haga `ALTER TABLE` para llevar la tabla real al diseño
>    que el código ya espera (agregar las columnas faltantes, migrar datos si los hubiera —
>    no los hay, está vacía).
> 2. O `DROP TABLE` + recrearla desde cero con el `CREATE TABLE` real de la migración
>    (más limpio, dado que está vacía) — **destructivo en el sentido de "no reversible",
>    aunque no hay datos que perder** — requiere confirmación explícita igual que cualquier
>    otro `DROP` de este proyecto.

**Esfuerzo:** XS-S. **Impacto:** Bajo hoy — verificado por grep que **ningún componente del
frontend llama a este endpoint actualmente** (`hunger-bar.ts` explícitamente decidió no
depender de él, ver comentario en su encabezado). Es deuda latente, no un bug visible al
usuario — pero rompe apenas alguien lo conecte a una pantalla sin saber que está roto.

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
