---

description: "Task list template for feature implementation"
---

# Tasks: Fotos en el Stepper de Registro

**Input**: Design documents from `Knowledge/29_Specs/004-fotos-stepper-registro/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (todos ya generados)

**Tests**: Sin tests unitarios dedicados — ver `research.md` § Testing (no hay `@testing-library/react` instalado, desproporcionado para este cambio). Verificación vía `tsc`/`eslint` + `quickstart.md` manual.

**Organization**: Tareas agrupadas por user story de `spec.md` (US1 = P1 avatar de usuario, US2 = P2 foto de mascota). Sin fase Setup — no hay scaffolding ni dependencias que instalar. 1 tarea Foundational compartida (estado de fallback de carga de imagen, usado por ambas historias).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias)
- **[Story]**: a qué user story pertenece (US1, US2)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único (Next.js App Router) — rutas relativas a `kittypau_app/`.

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: Estado compartido de "la imagen de este paso falló al cargar" — lo usan tanto US1 (círculo del avatar) como US2 (círculo de la foto de mascota) para caer al check "✓" en vez de mostrar una imagen rota (ver `research.md` § Fallback).

- [X] T001 En `kittypau_app/src/app/(public)/login/page.tsx`, agregar `const [photoLoadFailed, setPhotoLoadFailed] = useState<Record<number, boolean>>({});` junto a `completedMap` (~línea 191) — mismo shape (`Record<number, boolean>`) que `completedMap` ya usa — declarado junto a `stepErrorAt` (bloque de estado por número de paso) en vez de junto a `completedMap`, que no es un `useState` sino un `const` derivado en cada render

**Checkpoint**: Estado base listo — US1 y US2 pueden implementarse en paralelo desde acá.

---

## Phase 2: User Story 1 - Ver el avatar propio al completar el paso de Usuario (Priority: P1) 🎯 MVP

**Goal**: El círculo del paso 1 en la barra de progreso muestra el avatar elegido en vez del check "✓", una vez completado ese paso.

**Independent Test**: Escenario 1 de `quickstart.md` — elegir un avatar, completar el paso 1, avanzar al paso 2, y confirmar que el círculo del paso 1 muestra ese avatar.

### Implementation for User Story 1

- [X] T002 [US1] En `kittypau_app/src/app/(public)/login/page.tsx`, dentro del `span.login-step2-dot` de `stepperContent` (~línea 668-685), agregar un caso nuevo para el paso 1: si `number === 1 && completedMap[1] && registerAvatar && !photoLoadFailed[1]`, renderizar `<img src={registerAvatar} alt="Tu foto de perfil" onError={() => setPhotoLoadFailed((prev) => ({ ...prev, [1]: true }))} className="h-full w-full rounded-full object-cover" />` en vez de caer al `"✓"` — insertado ANTES del branch `completedMap[number] ? "✓" : number` existente, sin alterar el orden de prioridad de `hasError`/marca ya existente
- [ ] T003 [US1] Confirmar visualmente (Escenario 1 de `quickstart.md`) que el círculo del paso 1 conserva el tamaño/borde ya definidos por `login-step2-dot`/`login-step2-btn` (CSS existente, sin tocar estilos) — el `<img>` debe llenar el círculo igual que el logo de marca ya lo hace en el paso 3 — **NO ejecutado**: requiere navegador real. `tsc --noEmit`/`eslint` limpios (0 errores).

**Checkpoint**: US1 funciona de punta a punta, independiente de US2 — MVP entregable acá.

---

## Phase 3: User Story 2 - Ver la foto de la mascota al completar el paso de Mascota (Priority: P2)

**Goal**: El círculo del paso 2 muestra la foto de mascota elegida en vez del check "✓", una vez completado ese paso. Si no se eligió ninguna foto, se mantiene el check (FR-003).

**Independent Test**: Escenario 2 de `quickstart.md` — subir una foto de mascota, completar el paso 2, avanzar al paso 3, y confirmar que el círculo del paso 2 muestra esa foto (y que sin foto, sigue mostrando "✓").

### Implementation for User Story 2

- [X] T004 [US2] En `kittypau_app/src/app/(public)/login/_components/registro-flow.tsx`, agregar `onPetPhotoPreviewChange?: (url: string | null) => void;` a `RegistroFlowProps` (~línea 40-55) y un `useEffect` nuevo que lo notifique cada vez que cambia `petPhotoPreview` — mismo patrón exacto que el `useEffect` existente de `onProgress` (~línea 510-512): `useEffect(() => { onPetPhotoPreviewChange?.(petPhotoPreview); }, [petPhotoPreview, onPetPhotoPreviewChange]);`
- [X] T005 [US2] En `kittypau_app/src/app/(public)/login/page.tsx`: agregar `const [registerPetPhotoPreview, setRegisterPetPhotoPreview] = useState<string | null>(null);` junto a `registerPetName` (~línea 84), y pasar `onPetPhotoPreviewChange={setRegisterPetPhotoPreview}` a la invocación de `<RegistroFlow>` (~línea 2086-2103)
- [X] T006 [US2] En el mismo `span.login-step2-dot` de `stepperContent` tocado en T002, agregar el caso del paso 2: si `number === 2 && completedMap[2] && registerPetPhotoPreview && !photoLoadFailed[2]`, renderizar `<img src={registerPetPhotoPreview} alt="Foto de tu mascota" onError={() => setPhotoLoadFailed((prev) => ({ ...prev, [2]: true }))} className="h-full w-full rounded-full object-cover" />` — si `completedMap[2]` es true pero `registerPetPhotoPreview` es `null` (sin foto elegida, FR-003), cae al `"✓"` existente sin cambios

**Checkpoint**: US1 y US2 funcionan de forma independiente — las 2 user stories del pedido están completas.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final, sin cambios de código adicionales esperados.

- [X] T007 [P] Correr `cd kittypau_app && npx tsc --noEmit` y `npx eslint "src/app/(public)/login/page.tsx" "src/app/(public)/login/_components/registro-flow.tsx"` — confirmar 0 errores — **0 errores, 24 warnings preexistentes no relacionadas + 2 warnings nuevas esperadas (`@next/next/no-img-element` en los 2 `<img>` agregados, mismo patrón ya aceptado en spec 003)**
- [ ] T008 Ejecutar los 3 escenarios de `quickstart.md` de punta a punta en un navegador contra un dev server corriendo (click-through manual — no automatizable, ver `research.md` § Testing) — **NO ejecutado**, mismo motivo que en spec 003 (no puedo manejar un navegador real desde acá)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sin dependencias — BLOQUEA a US1 y US2 (ambas leen/escriben `photoLoadFailed`).
- **User Story 1 (Phase 2)**: depende de Foundational. Sin dependencia de US2 — es el MVP, toca solo `page.tsx`.
- **User Story 2 (Phase 3)**: depende de Foundational. Independiente de US1 en términos de funcionalidad, pero T006 edita el mismo bloque JSX que T002 tocó primero — en la práctica conviene hacerlas en secuencia (T002 antes que T006) aunque no haya dependencia lógica real, para evitar un conflicto de merge en el mismo `span`.
- **Polish (Phase 4)**: depende de que US1 y US2 (las que se vayan a entregar) estén completas.

### Parallel Opportunities

- T004 (registro-flow.tsx) y T005 (page.tsx, estado + wiring del prop) son archivos distintos — paralelizables entre sí, aunque T005 necesita que el prop exista en `RegistroFlowProps` (T004) para tipar sin error, así que en la práctica T004 va primero.
- T007 (tsc + eslint) es paralelizable respecto a T008 (manual) — ambas son verificación final, no se bloquean entre sí.

---

## Parallel Example

```bash
# Tras T001 (Foundational), en paralelo:
Task: "US1 completa — page.tsx circle logic (T002-T003)"
Task: "US2 completa — registro-flow.tsx callback (T004) + page.tsx wiring (T005-T006)"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Phase 1 (Foundational) — estado de fallback listo.
2. Phase 2 (US1) — avatar de usuario en el círculo del paso 1.
3. **Parar y validar**: Escenario 1 de `quickstart.md`. Ya resuelve el primer punto del pedido.

### Entrega incremental

1. Foundational → estado base listo.
2. + US1 → avatar en paso 1 → validar → ya es una mejora visible.
3. + US2 → foto de mascota en paso 2 → validar.
4. + Polish → verificación final.

---

## Notes

- Sin tabla de Complexity Tracking que traer de `plan.md` — no hubo violaciones de constitución.
- El orden de prioridad ya existente en el círculo (error "⚠" > logo de marca en paso 3 > foto/check > número) no se toca — los casos de T002/T006 se insertan como ramas más específicas dentro de "completado", antes del fallback "✓" genérico.
- Ninguna tarea toca `contracts/` — no existe esa carpeta para este feature (prop interno entre 2 componentes, no interfaz externa).
