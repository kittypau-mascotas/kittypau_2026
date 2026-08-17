---

description: "Task list template for feature implementation"
---

# Tasks: Compresión Automática de Foto de Mascota

**Input**: Design documents from `Knowledge/29_Specs/003-compresion-foto-mascota/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (todos ya generados)

**Tests**: Incluidos — `research.md` § Testing y `plan.md` ya definen Vitest para la función de compresión.

**Organization**: Tareas agrupadas por user story de `spec.md` (US1 = P1, US2 = P2, US3 = P3), con una fase Foundational previa para el módulo compartido del que dependen las 2 primeras historias.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias)
- **[Story]**: a qué user story pertenece (US1, US2, US3)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único (Next.js App Router) — todas las rutas relativas a `kittypau_app/`.

---

## Phase 1: Setup

**Purpose**: Scaffold del módulo nuevo — sin dependencias nuevas que instalar (Canvas API nativa).

- [X] T001 Crear `kittypau_app/src/lib/utils/photo-compress.ts` con la firma exportada `compressPhoto(file: File, opts?: {...}): Promise<File>` y sin implementación todavía (esqueleto tipado, mismo patrón de export que `src/lib/utils/api.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: La función de compresión compartida — la usan tanto US1 como US2, así que debe existir y estar probada antes de tocar cualquiera de las 2 pantallas.

**⚠️ CRITICAL**: Ninguna user story empieza hasta que esta fase esté completa.

- [X] T002 Implementar `compressPhoto()` en `kittypau_app/src/lib/utils/photo-compress.ts`: decodificar el `File` en un `<canvas>` (mismo enfoque que `applyCrop()` en `registro-flow.tsx:577-619` — `Image`/`createImageBitmap` + `drawImage`), downscale proporcional si el lado más largo supera el máximo (ver `research.md` § Estrategia de reducción), reencode iterativo con `canvas.toBlob(..., "image/jpeg", quality)` bajando calidad en pasos hasta entrar bajo el límite de tamaño, devolver `File` nuevo en `image/jpeg`
- [X] T003 Manejar en `compressPhoto()` el caso borde de `data-model.md` "Rechazada": si tras el piso de calidad el blob sigue sobre el límite, o si la decodificación falla (formato no soportado), lanzar un error con mensaje distinto al de "supera el tamaño" genérico (FR-005) — no devolver un archivo que sigue sobre el límite
- [X] T004 [P] Escribir tests unitarios en `kittypau_app/src/lib/utils/photo-compress.test.ts` (Vitest, mismo patrón que `api.test.ts`): (a) un blob mock ya bajo el límite pasa sin iteraciones de calidad innecesarias, (b) un blob mock sobre el límite termina bajo el límite tras `compressPhoto()`, (c) el caso "no se puede reducir más" lanza el error de T003 en vez de colgarse o devolver un archivo inválido — jsdom no está instalado en el proyecto (ver `research.md`), se stubearon `Image`/`canvas`/`URL` a mano en vez de agregar la dependencia
- [X] T005 Correr `cd kittypau_app && npm run test -- photo-compress` y confirmar que T004 pasa antes de continuar a las user stories — 9/9 tests pasan

**Checkpoint**: `compressPhoto()` existe, está probada, y es la base para US1 y US2.

---

## Phase 3: User Story 1 - Subir foto al editar una mascota existente (Priority: P1) 🎯 MVP

**Goal**: El botón "Cambiar foto" en `/pet` acepta fotos de más de 5MB reduciéndolas automáticamente, en vez de rechazarlas.

**Independent Test**: Escenario 1 de `quickstart.md` — seleccionar una foto de celular >5MB en `/pet` y confirmar que se sube y queda como foto de perfil, sin el mensaje "La foto no puede pesar más de 5 MB".

### Implementation for User Story 1

- [X] T006 [US1] En `kittypau_app/src/app/(app)/pet/page.tsx`, modificar `uploadPetPhoto()` (~línea 516-534): reemplazar el `if (file.size > MAX_PHOTO_BYTES) throw ...` por una llamada a `compressPhoto(file)` antes de `supabase.storage...upload(...)`, subiendo el resultado comprimido en vez del `File` original
- [X] T007 [US1] En el mismo archivo, actualizar el `catch` del handler del `<input type="file">` (~línea 776-807, bloque "Cambiar foto") para que si `compressPhoto()` lanza el error de T003, `setPhotoMessage` muestre ese mensaje (no el string viejo hardcodeado de "no puede pesar más de 5 MB", que deja de ser preciso) — el catch ya era genérico (`err.message`), no necesitó cambio de código, solo dejó de aplicar el string viejo porque ese string ya no existe en `uploadPetPhoto()`
- [ ] T008 [US1] Validación manual: ejecutar Escenario 1 completo de `quickstart.md` (foto >5MB y foto liviana, confirmar ambos casos y que no hay demora perceptible en el caso liviano — SC-005) — **NO ejecutado**: requiere un navegador real contra un dev server corriendo; verificado en su lugar `tsc --noEmit` (0 errores) y `eslint` (0 errores, solo warnings preexistentes no relacionados) sobre el archivo. Pendiente que alguien lo pruebe a mano.

**Checkpoint**: US1 funciona de punta a punta, independiente de US2/US3 — MVP entregable acá.

---

## Phase 4: User Story 2 - Subir foto durante el registro de una mascota nueva (Priority: P2)

**Goal**: El paso "Foto de mascota" del registro acepta fotos de más de 5MB reduciéndolas automáticamente, sin bloquear antes de llegar al editor de recorte existente.

**Independent Test**: Escenario 2 de `quickstart.md` — en el flujo de registro, seleccionar/tomar una foto >5MB y confirmar que el paso permite continuar (con o sin usar "Editar foto").

### Implementation for User Story 2

- [X] T009 [US2] En `kittypau_app/src/app/(public)/login/_components/registro-flow.tsx`, modificar `preparePhoto()` (~línea 518-535): reemplazar el reject directo (`if (file.size > MAX_PHOTO_MB * 1024 * 1024) { setPhotoError(...); return; }`) por una llamada a `compressPhoto(file)` — en éxito, `setFile`/`setPreview` reciben el archivo YA comprimido (no el original); en error, `setPhotoError` muestra el mensaje de T003 — `preparePhoto` pasó a ser `async`, los 2 `onChange` que la llaman no necesitaron cambios (React no espera el valor de retorno de `onChange`)
- [X] T010 [US2] Confirmar que `applyCrop()` (~línea 577-619) sigue funcionando sin cambios sobre el archivo ya comprimido que ahora vive en `petPhotoFile` — el recorte manual opcional debe seguir disponible y no debe re-subir de más (`applyCrop` ya reencodea a 512×512, eso es aceptable e independiente de T009) — confirmado por inspección: `applyCrop` no depende de cómo se llegó al `File` en `petPhotoFile`, opera igual sobre cualquier imagen decodificable
- [ ] T011 [US2] Validación manual: ejecutar Escenario 2 completo de `quickstart.md`, incluyendo el paso opcional de abrir "Editar foto" sobre la foto ya reducida — **NO ejecutado**, mismo motivo que T008 (requiere navegador real). Verificado `tsc --noEmit` + `eslint` limpios sobre el archivo.

**Checkpoint**: US1 y US2 funcionan de forma independiente, ambas sobre `compressPhoto()`.

---

## Phase 5: User Story 3 - Comportamiento consistente y mensaje claro si igual falla (Priority: P3)

**Goal**: Mismo umbral, misma calidad de salida y mismo tipo de mensaje de error en ambas pantallas — ninguna es más permisiva que la otra.

**Independent Test**: Escenario 3 de `quickstart.md` — misma foto de prueba en ambos flujos, mismo resultado.

### Implementation for User Story 3

- [X] T012 [US3] Eliminar `MAX_PHOTO_BYTES` (pet/page.tsx) y `MAX_PHOTO_MB` (registro-flow.tsx) como constantes locales duplicadas — mover el límite y el máximo de resolución a constantes exportadas desde `photo-compress.ts` (ej. `MAX_UPLOAD_BYTES`, `MAX_DIMENSION_PX`) e importarlas en ambos archivos, para que un cambio futuro de umbral no pueda desincronizarse entre las 2 pantallas — `MAX_PHOTO_BYTES` eliminada por completo de pet/page.tsx (ya no se usa, `compressPhoto()` aplica su propio default `MAX_UPLOAD_BYTES`); `MAX_PHOTO_MB` en registro-flow.tsx se mantiene solo para el texto visible, ahora derivada de `MAX_UPLOAD_BYTES` importada en vez de un número propio
- [X] T013 [US3] Igualar el texto del mensaje de error de T003/FR-005 en ambos flujos (`photoMessage` en pet/page.tsx, `photoError` en registro-flow.tsx) — mismo copy en los 2 lugares — ambos catch muestran `err.message` de `compressPhoto()` verbatim (idéntico por construcción, ninguno lo reenvuelve); los 2 fallbacks genéricos para errores no-Error ("No se pudo subir la foto." vs "No se pudo procesar la foto.") se dejaron distintos a propósito — cubren alcances distintos (toda la subida vs. solo el procesamiento de la foto) y ese caso no debería ocurrir en la práctica
- [ ] T014 [US3] Validación manual: ejecutar Escenario 3 completo de `quickstart.md` con la misma foto de prueba en ambas pantallas — **NO ejecutado**, mismo motivo que T008/T011.

**Checkpoint**: Las 3 user stories funcionan, con comportamiento consistente entre pantallas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coherencia de UI y documentación tras el cambio.

- [X] T015 [P] Actualizar el texto visible "JPG/PNG · hasta {MAX_PHOTO_MB}MB" en `registro-flow.tsx:1435` si el nombre de la constante cambió en T012 (mismo valor, solo confirmar que sigue leyendo la constante correcta y no un número hardcodeado) — sin cambios necesarios, sigue leyendo `MAX_PHOTO_MB` (ahora derivada), el JSX no cambió
- [X] T016 [P] Actualizar `Knowledge/01_Proyecto/DOC_MAESTRO_DOMINIO.md` § 7 "Estrategia de fotos" (fila "Tamaño máximo: 5 MB") para aclarar que el límite se aplica sobre el archivo ya reducido client-side, no sobre la foto original que el usuario selecciona — evita que el próximo lector interprete el 5MB como un límite duro de entrada
- [~] T017 Correr los 3 escenarios de `quickstart.md` de punta a punta una vez más tras T012-T013 (las constantes compartidas pueden haber cambiado el comportamiento fino) y `npm run test -- photo-compress` — **parcial**: `npm run test -- photo-compress` (9/9 ✅), `tsc --noEmit` (0 errores ✅), `eslint` sobre los 4 archivos tocados (0 errores, solo warnings preexistentes no relacionados ✅). Los 3 escenarios manuales de `quickstart.md` (click-through real en navegador) quedan pendientes — mismo motivo que T008/T011/T014.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Phase 1 — BLOQUEA las 3 user stories (todas consumen `compressPhoto()`).
- **User Story 1 (Phase 3)**: depende de Foundational. Sin dependencia de US2/US3 — es el MVP.
- **User Story 2 (Phase 4)**: depende de Foundational. Independiente de US1 (archivo distinto), puede hacerse en paralelo si hay 2 personas.
- **User Story 3 (Phase 5)**: depende de que US1 (T006-T007) y US2 (T009) ya existan — toca los mismos archivos que ambas para unificar constantes y mensajes, así que es secuencial después de las dos, no paralela.
- **Polish (Phase 6)**: depende de Phase 5.

### Parallel Opportunities

- T004 (tests) puede escribirse en paralelo con T002-T003 si se sigue TDD (escribir tests primero, confirmarlos en rojo, luego implementar) — marcado `[P]` porque es archivo distinto (`photo-compress.test.ts` vs `photo-compress.ts`), aunque lógicamente conviene tenerlos cerca en el tiempo.
- US1 (Phase 3) y US2 (Phase 4) pueden trabajarse en paralelo por 2 personas distintas una vez completa Phase 2 — tocan archivos distintos (`pet/page.tsx` vs `registro-flow.tsx`) y no se integran entre sí.
- T015 y T016 (Phase 6) son paralelas entre sí (archivos distintos).

---

## Parallel Example: Foundational + inicio de historias

```bash
# Tras T001 (scaffold), en paralelo:
Task: "Implementar compressPhoto() en src/lib/utils/photo-compress.ts (T002-T003)"
Task: "Escribir tests en src/lib/utils/photo-compress.test.ts (T004)"

# Tras Phase 2 completa, con 2 personas:
Task: "US1 completa — pet/page.tsx (T006-T008)"
Task: "US2 completa — registro-flow.tsx (T009-T011)"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Phase 1 (Setup) + Phase 2 (Foundational) — `compressPhoto()` lista y probada.
2. Phase 3 (US1) — arreglar `/pet`, que es el flujo reportado directamente como roto.
3. **Parar y validar**: Escenario 1 de `quickstart.md`. Esto ya resuelve el problema reportado por el usuario para mascotas ya registradas.

### Entrega incremental

1. Setup + Foundational → módulo compartido listo.
2. + US1 → `/pet` arreglado → validar → esto ya es un fix demostrable.
3. + US2 → registro arreglado → validar.
4. + US3 → consistencia entre pantallas + mensajes de error correctos → validar.
5. + Polish → docs y copy alineados.

---

## Notes

- Sin tabla de Complexity Tracking que traer de `plan.md` — no hubo violaciones de constitución.
- `applyCrop()` (editor de recorte manual en registro-flow.tsx) se mantiene intacto en todas las fases — ninguna tarea lo modifica, solo pasa a operar sobre un archivo ya comprimido (T009-T010).
- Ninguna tarea toca `contracts/` — no existe esa carpeta para este feature (ver `plan.md`).
