---
id: spec_12_recrear_analytics_db
title: SPEC 12 — Recrear la DB de analytics (pet_sessions/pet_daily_summary), eliminada por consumo de storage
type: spec
status: draft
owner: Mauro
created: 2026-08-14
updated: 2026-08-14
confirmado_por_mauro:
  - "El proyecto kittypau-analytics fue eliminado a propósito — consumía mucho storage en Supabase — 2026-08-14"
  - "No recrear todavía — dejar todo listo (schema, plan, checklist) para implementar en algún momento — 2026-08-14"
  - "Regla no-negociable: el proyecto nuevo NO puede vivir en la misma cuenta de Supabase que el proyecto principal — si comparten cuenta, el storage se llena rápido otra vez — 2026-08-14"
tags:
  - spec
  - analytics
  - supabase
  - bridge
  - infraestructura
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[02_Arquitectura/ARQ_Pipeline_End_to_End]]
  - [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]]
  - [[29_Specs/SPEC_11_Resumen_Consumo_Today]]
  - [[29_Specs/SPEC_05_Optimizacion_Tecnica]]
---

# SPEC 12 — Recrear la DB de analytics

> **No ejecutar todavía** — Mauro confirmó (2026-08-14) que el proyecto Supabase
> `kittypau-analytics` (ref `spfonxnyprjqxcxaqsbe`) fue **eliminado a propósito**, porque
> estaba consumiendo mucho storage. Este spec deja **todo preparado** (schema exacto,
> checklist de reconexión, y — a diferencia de la vez anterior — un plan de retención y una
> regla de cuenta separada (§0.0) para no repetir el mismo problema) para cuando se decida
> recrearlo. Ver
> [[02_Arquitectura/ARQ_Pipeline_End_to_End]] §3.2 para cómo se descubrió y confirmó (DNS +
> Management API — el proyecto ya no aparece ni pausado ni activo en la cuenta).

---

## 0.0 — Regla no-negociable (Mauro, 2026-08-14): cuenta de Supabase distinta a la principal

**El proyecto de analytics NO puede crearse en la misma cuenta de Supabase que el proyecto
principal (`zjdyhpntftgaynchqwfk`, org `kplantaiot's Org`).** Si comparten cuenta, el riesgo
es el mismo que ya pasó una vez: el storage se llena rápido otra vez. Esto **invalida el
comando de §3 tal como estaba escrito la primera vez** (usaba el mismo `SUPABASE_PAT` /
`organization_id` del proyecto principal) — ver §3 corregido más abajo.

**Implicación práctica para quien ejecute esto:** hace falta una **cuenta de Supabase nueva**
(email/login distinto, no solo una org distinta dentro de la misma cuenta — una org nueva
en la misma cuenta seguiría compartiendo el mismo login/facturación). Con esa cuenta nueva:
1. Crear la cuenta en supabase.com (o usar una ya existente que no sea la de `kplantaiot`).
2. Generar un Personal Access Token nuevo desde esa cuenta (Dashboard → Account → Access
   Tokens) — el `SUPABASE_PAT` actual en `.env.local` **no sirve para esto**, pertenece a la
   cuenta `kplantaiot`.
3. Recién con ese PAT nuevo, correr el comando de creación de proyecto (§3).

---

## 0. Por qué esto no es "clonar lo que había" sin más

La vez anterior el pipeline (`bridge/src/processor.js`) escribía a `pet_sessions` sin
ningún límite de retención — cada sesión detectada (umbral `SESSION_THRESHOLD_G=5g`, muy
sensible) generaba una fila para siempre. Con el plan Free de Supabase (500MB de DB), eso
es exactamente el tipo de crecimiento sin control que termina llenando el storage — Mauro
confirmó que fue justo esa la razón de la eliminación. **Recrear el schema idéntico sin
agregar retención sería reproducir el mismo problema en unos meses.** Este spec agrega ese
punto (§4) que el diseño original no tenía.

---

## 1. Qué recrear — schema exacto

Derivado del código real que ya escribe/lee estas tablas (`processor.js`,
`api/analytics/daily/route.ts`, `api/analytics/sessions/route.ts`) — no de un dump de schema
viejo, porque no quedó ninguno versionado en este repo (ver
[[02_Arquitectura/ARQ_Pipeline_End_to_End]] §3.2, nota ya existente en
[[29_Specs/SPEC_11_Resumen_Consumo_Today]]).

```sql
-- ── pet_sessions ──────────────────────────────────────────────────────────
create table public.pet_sessions (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null,
  pet_id           uuid not null,
  device_id        text not null,              -- device_id TEXTO (código, ej. "KPCL0035") —
                                                  -- processor.js guarda el código, no el UUID
                                                  -- de devices.id. Mantener así por
                                                  -- compatibilidad con el bridge actual; no
                                                  -- es una FK real (proyectos distintos).
  session_type     text not null check (session_type in ('food','water')),
  session_start    timestamptz not null,
  session_end      timestamptz not null,
  duration_sec     integer generated always as
                      (extract(epoch from (session_end - session_start))::integer) stored,
                    -- NUEVO respecto al schema viejo: antes `duration_sec` se leía en
                    -- api/analytics/sessions/route.ts pero processor.js nunca lo insertaba
                    -- (caveat sin resolver documentado en SPEC_11 §2.1). Columna generada =
                    -- siempre correcta, cero cambio de código necesario en processor.js.
  grams_consumed   numeric,
  water_ml         numeric,
  classification   text not null check (classification in ('low','normal','high')),
  anomaly_score    numeric,
  baseline_grams   numeric,
  avg_temperature  numeric,
  avg_humidity     numeric,
  is_premium_data  boolean not null default true,
  created_at       timestamptz not null default now()
);

create index idx_pet_sessions_owner_pet_start
  on public.pet_sessions (owner_id, pet_id, session_start desc);
  -- cubre el patrón real de api/analytics/sessions/route.ts:
  -- .eq('owner_id', X).eq('pet_id', Y).gte('session_start', ...).order('session_start', desc)

alter table public.pet_sessions enable row level security;
-- Solo el bridge (processor.js) y kittypau_app (API routes) tocan esta tabla, ambos con
-- SUPABASE_ANALYTICS_SERVICE_KEY (bypassa RLS). No hay acceso de usuario final directo a
-- esta DB — RLS default-deny es correcto y no requiere policies adicionales.

-- ── pet_daily_summary ─────────────────────────────────────────────────────
create table public.pet_daily_summary (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null,
  pet_id              uuid not null,
  summary_date        date not null,           -- 'YYYY-MM-DD' en America/Santiago,
                                                  -- ver processor.js: todayDateString()
  total_food_grams    numeric not null default 0,
  total_water_ml      numeric not null default 0,
  food_sessions       integer not null default 0,
  water_sessions      integer not null default 0,
  anomaly_count       integer not null default 0,
  skipped_meals       integer not null default 0,
                    -- SIEMPRE 0 hoy — processor.js nunca lo calcula (ver SPEC_11 §4). No es
                    -- un bug de este schema, es una limitación de la state machine actual.
  avg_temperature     numeric,                 -- referenciado en analytics/daily SELECT,
  avg_humidity        numeric,                 -- pero processor.js tampoco los agrega hoy —
                                                  -- mismo caveat, dejar nullable.
  first_session_at    timestamptz,
  last_session_at     timestamptz,
  readings_processed  integer not null default 0,
  processed_at        timestamptz,
  created_at          timestamptz not null default now(),

  constraint uq_pet_daily_summary_pet_date unique (pet_id, summary_date)
  -- CRÍTICO: processor.js hace upsert manual por (pet_id, summary_date) vía
  -- select-then-update-or-insert (no un UPSERT SQL real) — este constraint no cambia ese
  -- código, pero previene filas duplicadas si dos escrituras concurrentes llegan a la vez
  -- (condición de carrera real: dos devices de la misma mascota cerrando sesión al mismo
  -- tiempo). Sin este constraint, el schema viejo permitía silenciosamente esa duplicación.
);

alter table public.pet_daily_summary enable row level security;
```

**Diferencias deliberadas respecto al schema original** (documentadas para que quien lo
aplique sepa que es intencional, no un error de transcripción):
1. `duration_sec` como columna generada — cierra el caveat de SPEC_11 §2.1 sin tocar
   `processor.js`.
2. `unique (pet_id, summary_date)` en `pet_daily_summary` — el original no lo tenía
   (confirmado por lectura de `processor.js`, que hace su propio `select` antes de decidir
   `insert` vs `update`, en vez de confiar en un constraint).
3. Índice explícito en `pet_sessions` para el patrón de query real de
   `api/analytics/sessions/route.ts`.

---

## 2. Checklist de reconexión — 3 lugares, no 1

Reconectar credenciales nuevas (`SUPABASE_ANALYTICS_URL`, `SUPABASE_ANALYTICS_SERVICE_KEY`)
en los 3 sitios que las usan — olvidar uno dejaría un componente escribiendo/leyendo a un
proyecto que ya no coincide con los otros dos:

| # | Dónde | Cómo | Accesible desde esta sesión |
|---|---|---|---|
| 1 | `kittypau_app/.env.local` (dev local) | Editar directo | ✅ Sí |
| 2 | Vercel — Environment Variables del proyecto `kittypau_app` | Dashboard Vercel o `vercel env add` | ⚠️ No confirmado — requiere CLI de Vercel autenticado en esta sesión |
| 3 | Raspberry Pi — `.env` del bridge (`/home/kittypau/kittypau-bridge/.env` o ruta real, confirmar) | SSH a `192.168.100.119` | ⚠️ La Pi responde en la red local (verificado 2026-08-14), pero el intento de SSH en esta sesión fue bloqueado por el clasificador de seguridad del modo automático — requiere que Mauro habilite el permiso o lo haga manualmente |

---

## 3. Comando real para crear el proyecto (requiere la cuenta nueva de §0.0 primero)

> ⚠️ **Corregido tras la regla de §0.0** — la primera versión de este spec usaba el
> `SUPABASE_PAT` y el `organization_id` (`tzylulawfiocbfmsbmsl`, "kplantaiot's Org") del
> proyecto **principal**. Eso viola la regla de cuenta separada — no usar ese PAT/org para
> esto. Los valores de abajo son placeholders hasta que exista la cuenta nueva.

```bash
# 1. Con el PAT de la CUENTA NUEVA (no el SUPABASE_PAT actual de .env.local):
curl -s "https://api.supabase.com/v1/organizations" -H "Authorization: Bearer $NUEVO_PAT"
# → anotar el organization_id real de la cuenta nueva, reemplazar <ORG_ID_CUENTA_NUEVA> abajo

# 2. Generar una password fuerte para el nuevo proyecto (NO reusar la del proyecto eliminado)
DB_PASS=$(python -c "import secrets,string; a=string.ascii_letters+string.digits; print(''.join(secrets.choice(a) for _ in range(24)))")

curl -X POST "https://api.supabase.com/v1/projects" \
  -H "Authorization: Bearer $NUEVO_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"kittypau-analytics\",\"organization_id\":\"<ORG_ID_CUENTA_NUEVA>\",\"plan\":\"free\",\"region\":\"us-east-1\",\"db_pass\":\"$DB_PASS\"}"
```

Con una cuenta nueva (sin otros proyectos), el límite de proyectos activos del plan Free no
debería ser un problema — la cuenta `kplantaiot` ya tenía 2 proyectos antes de esto
(`zjdyhpntftgaynchqwfk` activo + `killtbpeuinqvyxpbtbt` inactivo de KPlant), así que sumar
un tercero ahí hubiera sido más ajustado. La regla de cuenta separada (§0.0) resuelve ese
problema de paso, aunque no haya sido la razón original.

`region: us-east-1` elegido por consistencia con el proyecto principal (misma región) — no
es una restricción técnica, se puede cambiar.

---

## 4. Retención — lo que el diseño original no tenía (agregar esta vez)

Para no repetir el motivo de la eliminación:

1. **`pet_sessions` es la tabla de crecimiento sin límite** (una fila por sesión detectada,
   para siempre). `pet_daily_summary` ya es un rollup — se mantiene chico por diseño (1 fila
   por mascota por día).
2. **Propuesta mínima, sin sobre-ingeniería:** un job periódico (Supabase `pg_cron`, que ya
   está disponible en proyectos Supabase, o un `DELETE` corrido a mano cada tanto) que borre
   `pet_sessions` con `session_start` más viejo que la ventana premium
   (`PREMIUM_HISTORY_DAYS = 365`, ya definida en `analytics/sessions/route.ts` — **la propia
   API nunca devuelve sesiones más viejas que eso**, así que retenerlas no aporta nada que
   la app pueda mostrar).
   ```sql
   -- correr mensualmente, vía pg_cron o manual
   delete from public.pet_sessions where session_start < now() - interval '365 days';
   ```
3. **No implementado en este spec** — es una decisión de producto (¿se quiere guardar
   histórico más allá de lo que la UI muestra, para análisis futuro?) antes de ser una
   tarea técnica. Dejar la pregunta explícita para cuando se recree: ¿retención dura de 365
   días, o guardar todo y solo limitar lo que la API expone (como hoy)?

---

## 5. Qué NO se pierde por no haber recreado esto todavía

- `readings` (la fuente cruda, en el proyecto principal) sigue intacta — nunca dependió de
  la DB de analytics.
- El algoritmo de `processor.js` es determinístico: **cuando se recree el proyecto, se
  puede escribir un script de backfill que re-corra la state machine sobre `readings`
  histórico** y repueble `pet_sessions`/`pet_daily_summary` desde cero — no es urgente, es
  una opción real si se quiere el histórico completo en vez de arrancar en blanco desde la
  fecha de recreación. No se diseñó ese script en este spec — anotado para cuando se decida
  recrear el proyecto.

---

## 6. Impacto mientras esto siga sin resolverse

- `/story` (único consumidor hoy de `/api/analytics/sessions`) sigue degradado/con errores.
- [[29_Specs/SPEC_11_Resumen_Consumo_Today]] sigue bloqueado — su premisa de "el pipeline ya
  corre, solo falta la UI" no se cumple hasta que este spec se ejecute.
- El bridge (`processor.js`) sigue best-effort intentando escribir a un host que no existe,
  sin que nada lo reporte más allá del log local de systemd en la Raspberry — no rompe nada
  más, pero es ruido silencioso en producción.

---

## Ver también

- [[02_Arquitectura/ARQ_Pipeline_End_to_End]] §3.2 — cómo se descubrió y confirmó que el proyecto ya no existe
- [[29_Specs/SPEC_11_Resumen_Consumo_Today]] — el plan de producto bloqueado por esto
- [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §2 — el otro bug (`device_type`) que también afecta `pet_sessions` una vez recreada
- [[29_Specs/SPEC_05_Optimizacion_Tecnica]] — deuda técnica del bridge en general
