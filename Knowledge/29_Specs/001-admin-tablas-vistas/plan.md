# Implementation Plan: Extracción de "Tablas y Vistas" en /admin (batch 4/N)

**Branch**: `001-admin-tablas-vistas` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `Knowledge/29_Specs/001-admin-tablas-vistas/spec.md`

## Summary

Extraer la sección "Tablas y Vistas (Uso Aproximado)" de `kittypau_app/src/app/(app)/admin/page.tsx`
(líneas 2858-2942 reales, confirmadas leyendo el código fuente) a un componente propio en
`admin/_components/tablas-vistas-card.tsx`, siguiendo exactamente el patrón ya usado 3 veces
en este mismo archivo: mover el JSX, pasar los datos ya calculados como props, sin fetch ni
cálculo propio en el componente nuevo.

## Technical Context

**Language/Version**: TypeScript (Next.js 16, App Router) — stack ya establecido, sin
elección nueva.

**Primary Dependencies**: React 19 + Tailwind CSS — ninguna dependencia nueva, mismas que ya
usan los 3 componentes hermanos (`section-status-card.tsx`, `auditoria-card.tsx`,
`infraestructura-card.tsx`, `tests-admin-card.tsx`).

**Storage**: N/A — el componente nuevo no toca Supabase directamente; consume
`dbObjectStats` (tipo `DbObjectStat`, ya definido en `page.tsx:265-274`), poblado por el
fetch compartido `GET /api/admin/overview` que ya existe.

**Testing**: `tsc --noEmit` + `eslint` + `next build` — mismo estándar de verificación que
los 3 batches anteriores (sin test unitario nuevo; consistente con cómo se verificaron
esos batches).

**Target Platform**: Web — panel `/admin`, Next.js App Router.

**Project Type**: Aplicación web full-stack existente (no se crea proyecto nuevo).

**Performance Goals**: N/A específico — el requisito es cero regresión, no una mejora de
performance.

**Constraints**: Cero regresión visual/funcional (spec FR-002). Debe mantener el gating por
`infraExpanded` (spec FR-004).

**Scale/Scope**: 1 sección (~85 líneas de JSX), 1 componente nuevo, 1 import en `page.tsx`.

**Hallazgo real durante la investigación de Phase 0** (no estaba en Knowledge, no se podía
saber sin leer el código): `infraExpanded` en `page.tsx:475` es hoy `const infraExpanded = true;`
— una constante hardcodeada, **no** viene de estado real ni de un toggle de UI. Esto ya lo
anotaba un comentario existente en el propio `infraestructura-card.tsx` ("hoy una const
`true`"), así que no es una sorpresa para el proyecto — pero confirma que el gate siempre
evalúa a verdadero hoy. Este batch no cambia ese comportamiento (fuera de alcance, ver
Assumptions del spec) — solo preserva el mismo gate tal cual, pasado como prop igual que ya
lo hace `infraestructura-card.tsx`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Ponytail (ladder) | ✅ PASS — reutiliza un patrón ya existente 3 veces en este mismo archivo (paso 2 del ladder: "¿ya existe en el codebase?"). Cero abstracción nueva. |
| II. Causa raíz, no síntoma | N/A — no es un fix de bug. |
| III. No-negociables | ✅ PASS — no toca validación, seguridad, ni escribe a producción. |
| IV. Arquitectura de datos | N/A — no toca `readings.csv`/Supabase directamente. |
| V. Motor Matemático v2 | N/A — no relacionado. |
| VI. IoT/Firmware | N/A — no relacionado. |
| VII. Knowledge Vault | ✅ PASS — grounded en `Knowledge/29_Specs/SPEC_02_UIUX_Mejoras.md`; el gap de conocimiento se resolvió leyendo código fuente (Phase 0), no se inventó. |
| VIII. Trabajo en 2 PCs | ✅ PASS — no requiere `git pull`/`push` fuera del flujo ya establecido; se documentará en `PENDIENTES_POR_PC.md` al cerrar. |
| Convivencia con Knowledge/29_Specs/ | ✅ PASS — este plan se basa en el spec, que a su vez cita a `Knowledge/29_Specs/SPEC_02_UIUX_Mejoras.md` explícitamente. |

Sin violaciones — no aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
Knowledge/29_Specs/001-admin-tablas-vistas/
├── plan.md              # este archivo
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks, todavía no creado)
```

### Source Code (repository root)

```text
kittypau_app/src/app/(app)/admin/
├── page.tsx                          # 3291 → ~3210 líneas (se retira el bloque 2858-2942)
└── _components/
    ├── section-status-card.tsx        # ya existe (batch 1)
    ├── avisos-criticos-card.tsx        # ya existe (batch 1)
    ├── kpi-ejecutivos-card.tsx         # ya existe (batch 1)
    ├── modelos-negocio-card.tsx        # ya existe (batch 1)
    ├── auditoria-card.tsx              # ya existe (batch 2)
    ├── infraestructura-card.tsx        # ya existe (batch 2) — mismo prop infraExpanded
    ├── tests-admin-card.tsx            # ya existe (batch 3)
    └── tablas-vistas-card.tsx          # NUEVO — este batch
```

**Structure Decision**: aplicación Next.js existente, un solo componente nuevo agregado al
directorio `admin/_components/` ya establecido — no se crea estructura nueva de proyecto.

## Complexity Tracking

*Sin violaciones del Constitution Check — sección no aplica.*
