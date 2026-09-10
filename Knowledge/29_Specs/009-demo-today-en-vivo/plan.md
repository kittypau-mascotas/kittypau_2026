# Implementation Plan: Demo /today en vivo con identidad del visitante

**Branch**: `009-demo-today-en-vivo` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `Knowledge/29_Specs/009-demo-today-en-vivo/spec.md`

## Summary

Una demo pública de una sola vista que **reutiliza el mismo componente de `/today`** para mostrar
los datos reales y en vivo de la mascota de demo (Bandida — KPCL0034 comida + KPCL0035 agua),
reemplazando únicamente (a) la identidad visible (nombre de mascota/dueño, avatar-gif por tipo) por
lo que ingresó el visitante y (b) el origen de los datos (lectura sin sesión en vez de `authFetch`).
Como parte de la misma feature se elimina el chatbot-gato del proyecto y se resuelven las rutas
alias `/client-demo` y `/test`.

**Enfoque técnico** (resuelto en [research.md](./research.md)):

1. **Reuso del componente**: extraer el cuerpo de `today/page.tsx` a un componente
   `today/_components/today-screen.tsx` (`<TodayScreen>`), dejando `page.tsx` como wrapper de 3
   líneas. `<TodayScreen>` gana 3 props opcionales: `mode` (`"authed"` por defecto | `"demo"`),
   `dataSource` (adaptador de origen de datos) e `identity` (override de identidad para demo). El
   camino `mode === "authed"` conserva exactamente el código actual. `/demo` renderiza
   `<TodayScreen mode="demo" …>`. El gráfico día/noche (lógica inline en el componente) se reusa
   sin extraer, precisamente porque se reusa el componente entero.
2. **Origen de datos sin sesión**: un endpoint nuevo `GET /api/demo/today` (bundle único),
   service_role, rate-limitado con la infra existente (`checkRateLimit`), **hard-scoped** a los
   device ids de demo resueltos de env server-side. La lógica de cómputo y el shaping de la
   respuesta se comparten con las rutas autenticadas vía `lib/hunger-bar-server.ts` (se extrae ahí
   el shaping que hoy vive en las rutas) → sin segundo lugar que mantener (FR-016 / SC-008).
3. **Chatbot-gato**: borrado completo (`src/chatbot-gato/`, `api/chatbot-gato/route.ts`, estilos
   `.trial-rpg-*`/`.login-trial-dialog-scene` de `globals.css`, imports+llamada en `/login`, archivo
   `/demo` viejo entero). Cambio quirúrgico en `/login`: solo se saca el chatbot; el modal "Personaliza
   tu demo" (que ya vive en `login/page.tsx` y ya colecta dueño/mascota/tipo) se conserva.
4. **Lead sin email**: extender `/api/demo/ingreso` + `demo_ingresos` para aceptar leads sin email,
   dedupeados por `visitor_id`, con `pet_type`. **Cambio de schema Supabase → checkpoint del
   Principio III** (aprobación explícita de Mauro antes de aplicar la migración).

## Technical Context

**Language/Version**: TypeScript 5 / React 19 / Next.js 16 (App Router, Turbopack) — `kittypau_app/`

**Primary Dependencies**: Next.js (route handlers + client components), `@supabase/supabase-js`
(`supabaseServer` = service_role, server-only), `mqtt` (WebSocket live, credenciales
`NEXT_PUBLIC_MQTT_*_READONLY` — no requiere sesión), `chart.js` (gráfico día/noche). Sin
dependencias nuevas.

**Storage**: Supabase Postgres (proyecto principal `zjdyhpntftgaynchqwfk`). Tablas tocadas:
`readings`, `devices`, `audit_events` (solo lectura desde la demo), `demo_ingresos` (+ RPC
`record_demo_ingreso` — cambio de schema, ver data-model). `readings.csv` / `readings_rows.csv`
no se tocan (Principio IV).

**Testing**: `vitest` (unit — rutas API tienen `route.test.ts` como en `hunger-bar`), `tsc`,
`eslint`, `next build`. Verificación visual manual de `/today` real (regresión, SC-006) y de
`/demo` contra la app autenticada (SC-002) por checklist en [quickstart.md](./quickstart.md).

**Target Platform**: Web (Vercel `kittypau-app.vercel.app`) + APK Capacitor (WebView que carga el
mismo JS remoto). La demo es JS puro → se despliega con `git push` a `main`, sin rebuild de APK.

**Project Type**: Web app monolítica (Next.js App Router: UI + API routes en el mismo proyecto).

**Performance Goals**: `/api/demo/today` responde en un rango comparable al de
`/api/pets/:id/hunger-bar` + `/api/pets/:id/consumo-periodo` combinados (ventanas de 10 y 32 días
sobre `readings`, ya medidas ~58k filas/32 días para KPCL0034). Cache-Control público corto
(`s-maxage=30, stale-while-revalidate=120`) para absorber concurrencia sin recomputar por visita.

**Constraints**:
- FR-012 / SC-005: la demo **nunca** devuelve datos de un device/mascota/cuenta distinta a la de
  demo. El endpoint valida contra ids de demo resueltos de env y responde 404 para cualquier otro.
- FR-013 / SC-006: `/today` autenticado y "Barras Sims" quedan idénticos (el camino
  `mode === "authed"` es el código actual sin cambios de lógica).
- FR-016 / SC-008: un cambio a `/today` aparece en la demo sin edición específica de demo. El
  único "seam" documentado es el shape del bundle `/api/demo/today` y el adaptador `dataSource`.
- Principio I (cambios quirúrgicos en `/login`): el diff en `login/page.tsx` se limita a eliminar
  el chatbot-gato.
- Principio III: la migración de `demo_ingresos` no se aplica sin OK explícito de Mauro.
- Principio VIII: seguir el protocolo de `Knowledge/19_DevOps/README_DevOps.md` antes de
  `git pull`/`push`.

**Scale/Scope**: 1 dispositivo de demo (2 devices físicos). 1 vista. ~5-7 archivos nuevos, ~4
archivos modificados, ~16 archivos + ~430 líneas CSS borrados (chatbot-gato + `/demo` viejo).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitución v1.3.0 (`.specify/memory/constitution.md`).

| Principio | Evaluación | Estado |
|---|---|---|
| **I. Ponytail / diff más corto / cambios quirúrgicos** | La feature es "reusar `/today`, no duplicar". La única duplicación posible (el shape del bundle demo) se documenta como deuda explícita (FR-016). Chatbot-gato = eliminación pura. `/login` = cambio quirúrgico (solo sacar el chatbot). **Excepción justificada**: extraer el cuerpo de `today/page.tsx` a `<TodayScreen>` es un diff grande para un archivo sensible — ver Complexity Tracking. | ✅ con nota |
| **II. Fix de bug = causa raíz** | El lead-sin-email se arregla en el trust boundary compartido (ruta `/api/demo/ingreso` + RPC), no por caller. | ✅ |
| **III. No-negociables (writes a prod / schema)** | Endpoints de demo: **solo lectura**, service_role, scoped a ids de demo, rate-limitados (FR-012). La migración de `demo_ingresos` (email nullable + `visitor_id` + `pet_type` + RPC nuevo) es un **checkpoint**: se diseña acá, se aplica solo tras OK explícito de Mauro en `/speckit-implement`. Validación de input del visitante en el boundary (nombres, largo, trim) no se simplifica. | ✅ con checkpoint |
| **IV. Arquitectura de datos histórica** | No se toca `readings.csv` ni `readings_rows.csv`. La demo lee `readings`/`audit_events` de Supabase, no escribe. | ✅ |
| **V. Motor Matemático v2** | No se toca `shape_features_v2.py` ni el motor de clasificación — la demo consume el mismo `computeHungerBar` / `lib/motor-alimentacion` vía `hunger-bar-server.ts`. | ✅ |
| **VI. IoT / Firmware** | Sin cambios de firmware. | ✅ |
| **VII. Knowledge = fuente de verdad** | Spec fundamentado en `Knowledge/` (ESTRUCTURA_src_app.md, SPEC_11, spec 007). El plan no inventa dominio nuevo. Al cerrar: actualizar `Knowledge/04_Frontend/ESTRUCTURA_src_app.md` (la `/demo` cambió de concepto) y `PENDIENTES_POR_PC.md`. | ✅ |
| **VIII. Trabajo en 2 PCs** | `/speckit-implement` debe seguir el protocolo de sync antes de cualquier `git pull`/`push`. | ✅ |
| **Convivencia con `Knowledge/29_Specs/`** | La feature vive en `Knowledge/29_Specs/009-demo-today-en-vivo/`. `.specify/feature.json` ya apunta ahí. | ✅ |
| **`feedback_barras_sims_protegido`** | La demo **no** agrega cards/métricas a "Barras Sims" — renderiza el mismo componente en modo lectura. | ✅ (FR-013) |

**Resultado del gate**: PASS con un ítem en Complexity Tracking y un checkpoint de Principio III.
No hay violaciones sin justificar.

## Project Structure

### Documentation (this feature)

```text
Knowledge/29_Specs/009-demo-today-en-vivo/
├── spec.md              # /speckit-specify (hecho)
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Phase 0 (/speckit-plan)
├── data-model.md        # Phase 1 (/speckit-plan)
├── quickstart.md        # Phase 1 (/speckit-plan)
├── contracts/           # Phase 1 (/speckit-plan)
│   ├── demo-today-api.md
│   └── demo-ingreso-api.md
├── checklists/
│   └── requirements.md  # /speckit-specify (hecho)
└── tasks.md             # /speckit-tasks (NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
kittypau_app/src/
├── app/
│   ├── (app)/today/
│   │   ├── page.tsx                       # MOD: pasa a wrapper de <TodayScreen mode="authed">
│   │   └── _components/
│   │       ├── today-screen.tsx           # NUEVO: cuerpo de la vista, movido de page.tsx + 3 props
│   │       ├── barras-sims-card.tsx       # SIN CAMBIOS (se reusa tal cual)
│   │       ├── bowl-wellness-card.tsx     # SIN CAMBIOS
│   │       ├── day-night-timeline-card.tsx# SIN CAMBIOS
│   │       ├── consumo-kpis-card.tsx      # SIN CAMBIOS
│   │       └── consumo-periodo-card.tsx   # SIN CAMBIOS
│   ├── (public)/
│   │   ├── demo/page.tsx                  # REEMPLAZO TOTAL: form "Personaliza tu demo" (si no hay
│   │   │                                  #   identidad recordada) + <TodayScreen mode="demo"> + CTA
│   │   ├── client-demo/page.tsx           # MOD: redirect 308 a /demo (FR-019)
│   │   ├── test/page.tsx                  # MOD: redirect 308 a /demo (FR-019)
│   │   └── login/page.tsx                 # MOD quirúrgico: quitar chatbot-gato (imports, runtime,
│   │                                      #   llamada), quitar seteo de kittypau_demo_show_rpg
│   └── api/
│       ├── demo/
│       │   ├── today/route.ts             # NUEVO: bundle público read-only, scoped a devices demo
│       │   └── ingreso/route.ts           # MOD: aceptar lead sin email, dedupe por visitor_id, pet_type
│       └── chatbot-gato/route.ts          # BORRAR
├── lib/
│   ├── hunger-bar-server.ts               # MOD: extraer buildHungerBarPayload / buildConsumoPeriodoPayload
│   ├── demo/
│   │   ├── demo-config.ts                 # NUEVO: resuelve DEMO_* de env (device ids), server-only
│   │   └── demo-data-source.ts            # NUEVO: adaptador dataSource para <TodayScreen mode="demo">
│   ├── today/
│   │   └── today-data-source.ts           # NUEVO: tipo TodayDataSource + authedDataSource (extraído de page.tsx)
│   └── demo-identity.ts                   # NUEVO: leer/escribir/limpiar kittypau_demo_* (localStorage) + tipos
├── chatbot-gato/                          # BORRAR CARPETA COMPLETA (13 archivos)
└── app/globals.css                        # MOD: borrar bloques .trial-rpg-* / .login-trial-dialog-scene

supabase/migrations/
└── 2026XXXXXXXXXX_demo_ingresos_sin_email.sql   # NUEVO (aplicar solo con OK de Mauro — Principio III)
```

**Structure Decision**: Web app monolítica Next.js existente (`kittypau_app/`). No se introduce
estructura nueva — se sigue el layout actual (`app/(app)`, `app/(public)`, `app/api`, `lib/`). La
extracción de `<TodayScreen>` sigue el mismo patrón ya usado en esta área (`_components/` para
piezas de `/today`, `lib/hunger-bar-server.ts` para la parte server-only reusable).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Extraer el cuerpo de `today/page.tsx` (~2840 líneas, archivo sensible que Mauro revirtió 3x) a `<TodayScreen>` con 3 props — diff más grande que "quirúrgico" | FR-016 / SC-008 exigen que la demo sea **el mismo componente**, no una copia. Un componente compartido es la única forma de que un cambio futuro a `/today` aparezca en la demo sin editar la demo. Las 3 props tienen default que preserva el comportamiento autenticado exacto. | (a) Importar el módulo de ruta `today/page.tsx` desde `/demo`: acopla dos rutas a un default export de `page`, frágil ante cambios de Next. (b) Copiar la vista a un archivo de demo: viola FR-016 explícitamente (dos lugares que mantener sincronizados a mano). (c) Extraer solo sub-vistas (cards) y rearmar el layout en la demo: el gráfico día/noche vive inline con ~15 vars de estado → habría que extraerlo también o duplicarlo; más superficie de drift, no menos. |

## Phase 0 — ver [research.md](./research.md)

Resuelve: (1) mecanismo de acceso a datos sin sesión; (2) reuso del árbol de componentes sin
forkear; (3) alcance y orden del borrado del chatbot-gato; (4) lead sin email y su impacto de
schema; (5) resolución de `/client-demo` y `/test`.

## Phase 1 — ver [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

## Post-Design Constitution Re-check

Tras Phase 0/1, sin cambios respecto al gate inicial:

- **I. Ponytail**: el diseño no agregó abstracciones nuevas más allá del `TodayDataSource` (una
  interface con 2 implementaciones — justificada: es el seam que evita el fork prohibido por
  FR-016). El bundle `/api/demo/today` reusa `hunger-bar-server.ts`; no reimplementa cómputo. La
  extracción de `<TodayScreen>` sigue en Complexity Tracking (sin cambios).
- **III.**: los artefactos confirman endpoints de demo read-only + el checkpoint de la migración
  `demo_ingresos` documentado en data-model §3, contracts, y quickstart (con fallback si no hay OK).
- **VII.**: quickstart incluye actualizar `ESTRUCTURA_src_app.md` y `PENDIENTES_POR_PC.md` al cerrar.
- Resto de principios: sin superficie nueva. **Gate PASS.**

## Seguimiento — intents no cubiertos por este plan

Ninguno. Todo el input del usuario para `/speckit-plan` es diseño técnico de la feature 009.
Siguiente comando del flujo: `/speckit-tasks`.
