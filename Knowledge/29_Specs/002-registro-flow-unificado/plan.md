# Implementation Plan: Registro unificado — verificación por correo, 3 pasos, ajuste a pantalla

**Branch**: `002-registro-flow-unificado` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `Knowledge/29_Specs/002-registro-flow-unificado/spec.md`

## Summary

Rediseño del flujo de registro de Kittypau (6 User Stories): (1) verificación de correo
obligatoria vía Supabase Auth con asunto/contenido personalizado (nombre + mascota); (2) fusión
de los pasos "Cuenta"+"Usuario" en un único paso, dejando 3 pasos totales (Usuario → Mascota →
Kittypau, el último con marca en vez de texto "Dispositivo"); (3) el contenido de cada paso se
ajusta al alto de pantalla disponible (scroll solo como respaldo); (4) el paso Mascota se
separa en Registro Básico (obligatorio) + Ficha Detallada opcional (Salud + Alimentación); (5)
estilo de formulario en columna única, radio en vez de select para sí/no, tamaños táctiles y
tipográficos mínimos; (6) círculo rojo de notificación en el ítem "Mascota" del menú mientras
la Ficha Detallada esté incompleta, editable desde `/pet` en cualquier momento.

Es una modificación de un flujo ya construido, no una feature desde cero: la mayoría de la
lógica de estado, validación y persistencia ya existe (`registro-flow.tsx`, `onRegister`,
`resendConfirmation`) — el trabajo es reestructurar UI/CSS existente, agregar columnas nuevas a
`pets` para la Ficha Detallada, y una config de Supabase Auth (fuera del código, requiere
confirmación explícita antes de aplicarse en producción).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19 — stack ya establecido, sin
elección nueva.

**Primary Dependencies**: `@supabase/supabase-js` (Auth + Postgres, ya en uso), Tailwind CSS,
`framer-motion` (ya usado en el modal de registro vía `AnimatePresence`/`motion.div`) — ninguna
dependencia nueva.

**Storage**: Supabase Postgres. Tablas ya existentes `public.profiles` y `public.pets`
(`supabase/migrations/20260208134653_apply_schema_update.sql`) requieren `ALTER TABLE` para
columnas nuevas de Ficha Detallada — ver `data-model.md`. Sin tablas nuevas.

**Testing**: `tsc --noEmit` + `eslint` + `next build` (mismo estándar que specs anteriores de
este proyecto) + verificación manual con Playwright contra el dev server en viewports de
escritorio/tablet/móvil — patrón ya usado en este mismo spec durante Phase 0 (ver research.md).
Sin test unitario nuevo, consistente con cómo se verificaron los batches anteriores del panel
admin.

**Target Platform**: Web (Next.js, `/login` y `/pet`) + la misma app empaquetada como APK vía
Capacitor (mismo WebView, sin código nativo separado).

**Project Type**: Aplicación web full-stack existente — modificación de rutas y componentes ya
presentes, no se crea proyecto nuevo.

**Performance Goals**: N/A específico — el requisito es cero regresión en el flujo de registro
existente, no una mejora de performance.

**Constraints**: Cero pérdida de datos de `profiles`/`pets` ya existentes (Principio IV no
aplica directo — es `readings.csv`/Supabase histórico — pero el mismo espíritu de "nunca
truncar/sobreescribir sin ALTER aditivo" aplica). Toda escritura a producción (`ALTER TABLE`,
activar el toggle "Confirm email", editar la plantilla de correo en el dashboard de Supabase)
requiere confirmación explícita antes de ejecutarse (Principio III).

**Scale/Scope**: 4 archivos de UI (`login/page.tsx`, `registro-flow.tsx`, `pet/page.tsx`,
`app-nav.tsx`), 1 archivo CSS (`globals.css`), 2 rutas de API ya existentes a extender
(`api/pets/route.ts`, `api/pets/[id]/route.ts`), 1 migración SQL aditiva, 1 cambio de
configuración en el dashboard de Supabase Auth (plantilla de correo + toggle, fuera de git).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Ponytail (ladder) | ✅ PASS — reutiliza `PATCH /api/pets/[id]` ya existente (mismo patrón `allowedFields`) para la Ficha Detallada en vez de crear un endpoint nuevo; reutiliza `FieldCard`, `brand-logo-badge`, el mecanismo `resendConfirmation` y el patrón de progreso "reabrible" ya documentado. Ficha Detallada usa 2 columnas `jsonb` (`health_profile`, `feeding_profile`) en vez de ~18 columnas sueltas — evita una migración nueva cada vez que se agregue un campo futuro ("después podemos agregar más", palabras del propio Mauro), sin sobre-diseñar con una tabla aparte para 2 objetos por mascota. |
| II. Causa raíz, no síntoma | ✅ PASS — no es un fix de bug, es una reestructuración de UI+datos ya especificada. |
| III. No-negociables | ✅ PASS — ninguna escritura a producción (migración, toggle de Supabase, plantilla de correo) se ejecuta sin confirmación explícita previa, documentado en cada tarea correspondiente. |
| IV. Arquitectura de datos | N/A — no toca `readings.csv`/`readings_rows.csv`. |
| V. Motor Matemático v2 | N/A — no relacionado. |
| VI. IoT/Firmware | N/A — no relacionado. |
| VII. Knowledge Vault | ✅ PASS — grounded en `DOC_MAESTRO_DOMINIO.md` §6, `ENUMS_OFICIALES.md`, y en el código real leído en Phase 0 (research.md). Gaps declarados explícitamente donde correspondía (ej. semántica de "Ficha Detallada completa", resuelta en research.md, no inventada en el spec). |
| VIII. Trabajo en 2 PCs | ✅ PASS — no requiere `git pull`/`push` fuera del flujo ya establecido; se documentará en `PENDIENTES_POR_PC.md` al cerrar la implementación. |
| Convivencia con Knowledge/29_Specs/ | ✅ PASS — este plan vive en `Knowledge/29_Specs/002-registro-flow-unificado/`, `.specify/feature.json` ya apunta acá. |

Sin violaciones — no aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
Knowledge/29_Specs/002-registro-flow-unificado/
├── spec.md               # 6 User Stories, FR-001..FR-027, SC-001..SC-010
├── plan.md                # este archivo
├── research.md             # Phase 0 output
├── data-model.md           # Phase 1 output
├── quickstart.md           # Phase 1 output
├── contracts/               # Phase 1 output
│   └── pets-api.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Phase 2 output (/speckit-tasks, todavía no creado)
```

### Source Code (repository root)

```text
kittypau_app/src/app/
├── (public)/login/
│   ├── page.tsx                       # stepMeta 4→3, registerStep merge, onRegister con options.data (user_name/pet_name)
│   ├── globals.css (../../globals.css) # .login-register-body-registro: overflow-y fallback fuera de mobile
│   └── _components/
│       └── registro-flow.tsx           # paso 1 fusionado, Registro Básico + Ficha Detallada, columna única, radios, FieldCard 48px/16px
├── (app)/pet/
│   └── page.tsx                        # + secciones Salud y Alimentación (Ficha Detallada), editable post-registro
├── _components/
│   └── app-nav.tsx                     # círculo rojo en item "Mascota" según completeness
└── api/pets/
    ├── route.ts                        # POST: + sex, microchip_number, birth/intake date
    └── [id]/route.ts                   # PATCH: + health_profile, feeding_profile, completed_at

supabase/migrations/
└── <timestamp>_registro_flow_unificado_pet_detail.sql   # ALTER TABLE public.pets (aditivo, requiere confirmación)
```

**Structure Decision**: aplicación Next.js existente — se modifican 6 archivos de UI/API ya
presentes y se agrega 1 migración aditiva. No se crea estructura de proyecto nueva. La config
de Supabase Auth (toggle + plantilla de correo) vive en el dashboard del proyecto
(`zjdyhpntftgaynchqwfk`), fuera del repo — se documenta como tarea manual con confirmación
explícita, no como archivo de código.

## Complexity Tracking

*Sin violaciones del Constitution Check — sección no aplica.*
