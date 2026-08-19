---

description: "Task list for feature implementation"
---

# Tasks: Solo Placeholder, Nunca Autocompletar en Login/Registro

**Input**: Design documents from `Knowledge/29_Specs/006-solo-placeholder-sin-autocompletar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No solicitados explícitamente — ver research.md § Testing (sin infraestructura de testing de componentes React en este archivo; validación vía `tsc`/`eslint` + quickstart.md manual).

**Organization**: Tareas agrupadas por user story (spec.md). Un solo archivo modificado (`page.tsx`) + 2 archivos eliminados.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias)
- **[Story]**: US1 o US2, según spec.md

## Path Conventions

Proyecto único (`kittypau_app/`). Todos los paths son relativos a la raíz del repo.

---

## Phase 1: Setup

**Purpose**: Confirmar el estado real del archivo antes de tocar nada (los números de línea ya relevados en research.md pueden haber cambiado si algo se tocó desde entonces).

- [X] T001 Confirmar con grep los números de línea actuales de los 5 campos objetivo (`id="login-email"`, `id="login-password"`, email de reset, email/contraseña de registro paso 1) y del bloque `known-emails`/`<datalist>` en `kittypau_app/src/app/(public)/login/page.tsx`, actualizando mentalmente el plan si difieren de research.md.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Patrón compartido que todas las tareas de US1 van a reutilizar 5 veces — definirlo una sola vez evita 5 copias del mismo `onFocus`/`onMouseDown` inline.

**⚠️ CRITICAL**: Ningún campo de US1 se toca hasta que este patrón exista.

- [X] T002 En `kittypau_app/src/app/(public)/login/page.tsx`, agregar un estado `isFieldLocked` por campo objetivo (5 booleanos `useState(true)`, uno por campo: `loginEmailLocked`, `loginPasswordLocked`, `resetEmailLocked`, `registerEmailLocked`, `registerPasswordLocked`) y un único handler reutilizable `unlock(setter)` que llama `setter(false)` — se usa igual en los 5 `onFocus`/`onMouseDown` sin duplicar lógica.

**Checkpoint**: Patrón listo — implementación de US1 puede empezar.

---

## Phase 3: User Story 1 - Los campos de email y contraseña nunca vienen pre-llenados (Priority: P1) 🎯 MVP

**Goal**: Ningún campo de email/contraseña de login, registro o reset se pre-llena ni sugiere nada al cargar — el patrón readOnly-hasta-foco reemplaza la confianza en `autoComplete`, y las sugerencias propias de spec 004 (datalist) se eliminan por completo.

**Independent Test**: Guardar una credencial real en el navegador, reabrir los 3 formularios, confirmar que los 5 campos están vacíos y sin dropdown de sugerencias al hacer foco (quickstart.md Escenarios 1-3).

### Implementation for User Story 1

- [X] T003 [US1] En `kittypau_app/src/app/(public)/login/page.tsx`, campo `id="login-email"` (~línea 1665): agregar `readOnly={loginEmailLocked}` y `onFocus`/`onMouseDown` que llaman `unlock(setLoginEmailLocked)`; quitar el atributo `list="login-known-emails"`.
- [X] T004 [US1] En `kittypau_app/src/app/(public)/login/page.tsx`, eliminar el elemento `<datalist id="login-known-emails">` completo (poblado desde `knownEmails`), asociado al campo de email de login.
- [X] T005 [US1] En `kittypau_app/src/app/(public)/login/page.tsx`, campo `id="login-password"` (~línea 1705): agregar `readOnly={loginPasswordLocked}` y `onFocus`/`onMouseDown` que llaman `unlock(setLoginPasswordLocked)`.
- [X] T006 [P] [US1] En `kittypau_app/src/app/(public)/login/page.tsx`, campo de email de "Olvidé mi clave" (~línea 1832, `autoComplete="email"`): agregar `readOnly={resetEmailLocked}` y `onFocus`/`onMouseDown` que llaman `unlock(setResetEmailLocked)`.
- [X] T007 [P] [US1] En `kittypau_app/src/app/(public)/login/page.tsx`, campo de email de registro paso 1 (~línea 2053, `autoComplete="email"` — el campo que causó el bug real "User already registered"): agregar `readOnly={registerEmailLocked}` y `onFocus`/`onMouseDown` que llaman `unlock(setRegisterEmailLocked)`.
- [X] T008 [P] [US1] En `kittypau_app/src/app/(public)/login/page.tsx`, campo de contraseña de registro paso 1 (~línea 2077, `autoComplete="new-password"`): agregar `readOnly={registerPasswordLocked}` y `onFocus`/`onMouseDown` que llaman `unlock(setRegisterPasswordLocked)`.
- [X] T009 [US1] En `kittypau_app/src/app/(public)/login/page.tsx`, eliminar el import de `getKnownEmails`/`rememberEmailOnThisDevice` desde `@/lib/utils/known-emails`, el estado `knownEmails` + su `useEffect` de carga inicial, y los 2 call-sites de `rememberEmailOnThisDevice()` (post-login exitoso y post-signup exitoso) — quedan sin consumidor tras T003/T004.
- [X] T010 [US1] Eliminar `kittypau_app/src/lib/utils/known-emails.ts` y `kittypau_app/src/lib/utils/known-emails.test.ts` (sin consumidor tras T009).

**Checkpoint**: US1 completa — los 5 campos nunca se pre-llenan, cero sugerencias propias o nativas al cargar.

---

## Phase 4: User Story 2 - El placeholder sigue guiando qué formato se espera (Priority: P2)

**Goal**: Confirmar que ningún cambio de US1 removió o alteró el placeholder de los 5 campos — un campo `readOnly` sigue mostrando su `placeholder` con normalidad, así que esto es verificación, no código nuevo.

**Independent Test**: Abrir los 3 formularios sin historial de navegador y confirmar que los 5 campos muestran su placeholder (quickstart.md Escenario 4).

### Implementation for User Story 2

- [X] T011 [US2] Confirmar visualmente (o releyendo el diff de T003-T008) que los 5 campos conservan su atributo `placeholder` sin cambios de contenido tras aplicar el patrón readOnly-hasta-foco — no requiere edición si T003-T008 se hicieron sin tocar `placeholder`.

**Checkpoint**: US2 completa — ninguna guía visual se perdió.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final antes de dar la feature por terminada.

- [X] T012 Ejecutar `cd kittypau_app && npx tsc --noEmit` — 0 errores.
- [X] T013 Ejecutar `cd kittypau_app && npx eslint "src/app/(public)/login/page.tsx"` — 0 errores nuevos.
- [X] T014 Ejecutar `cd kittypau_app && npm run build` — build completo sin errores.
- [ ] T015 Validar manualmente los 4 escenarios de `quickstart.md` (login, registro — el caso real del bug, reset, placeholders visibles) en local o preview.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Phase 1 — BLOQUEA toda la Phase 3.
- **US1 (Phase 3)**: depende de Phase 2. T003-T008 son independientes entre sí salvo T003→T004 (mismo campo/datalist relacionados, T004 requiere que T003 ya haya quitado el `list=`). T009 depende de que T003/T004 ya existan (para saber qué import/estado queda sin uso). T010 depende de T009.
- **US2 (Phase 4)**: depende de que Phase 3 esté completa (es verificación de su resultado).
- **Polish (Phase 5)**: depende de Phases 3 y 4 completas.

### Parallel Opportunities

- T006, T007, T008 son [P] entre sí (campos distintos, sin relación de datalist).
- T003+T004 y T005 pueden hacerse en paralelo con T006/T007/T008 si se coordina con cuidado de no pisar el mismo archivo simultáneamente (mismo archivo `page.tsx` — en la práctica, secuencial es más simple dado que es 1 solo archivo).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → **STOP y validar** con quickstart.md Escenarios 1-3.
2. US1 por sí sola ya resuelve el bug real (SC-001, SC-002) — es el MVP completo del pedido.

### Incremental Delivery

1. Setup + Foundational → patrón listo.
2. US1 → bug real resuelto, campos nunca se pre-llenan.
3. US2 → confirma que no se rompió la guía de placeholder (mayormente gratis si T003-T008 no tocaron `placeholder`).
4. Polish → verificación automatizada + manual final.
