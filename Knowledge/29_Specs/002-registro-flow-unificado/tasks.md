---
description: "Task list for 002-registro-flow-unificado"
---

# Tasks: Registro unificado — verificación por correo, 3 pasos, ajuste a pantalla

**Input**: Design documents from `Knowledge/29_Specs/002-registro-flow-unificado/`
(spec.md, plan.md, research.md, data-model.md, contracts/pets-api.md, quickstart.md)

**Tests**: No solicitados explícitamente en el spec (verificación es `tsc --noEmit` + `eslint` +
`next build` + Playwright manual, igual que specs anteriores de este proyecto) — sin tareas de
test automatizado.

**Orden de ejecución real vs. prioridad del spec**: las prioridades del spec son
US1=P1, US2=P1, US3=P2, US4=P2, US5=P2, US6=P2. US1 y US2 se implementan juntas (Fase 3) porque
modifican el mismo código (el paso 1 fusionado y `onRegister`) — no tiene sentido separarlas.
Entre las historias P2, el orden de ejecución es US4 → US6 → US5 → US3 para evitar rehacer el
mismo JSX dos veces (US5 aplica el estilo de columna única sobre el contenido final de US4/US6;
US3 generaliza el `overflow` ya sabiendo cómo queda el layout después de US5). Esto no cambia
qué es MVP (US1+US2 lo es) — solo el orden dentro de los P2.

## Phase 1: Setup

- [x] T001 Aplicar migración aditiva `supabase/migrations/20260816045125_registro_flow_unificado_pet_detail.sql`
      contra producción (`public.pets`: `sex`, `microchip_number`, `birth_date`, `intake_date`,
      `health_profile`, `feeding_profile`, `health_profile_completed_at`,
      `feeding_profile_completed_at`) — **ya ejecutada y verificada** (8 columnas confirmadas
      vía `information_schema`, ver conversación).
- [x] T002 Activado por Mauro en el dashboard de Supabase Auth (proyecto `zjdyhpntftgaynchqwfk`):
      (a) toggle "Confirm email" en Authentication → Sign In/Providers, (b) plantilla
      "Confirm signup" con asunto y cuerpo personalizados. **Probado end-to-end 2026-08-16**
      con la cuenta `usuario_1`/`mascota_1` (`frentecalamari@gmail.com`) — correo recibido con
      personalización correcta, botón de confirmación funcional. Pendiente aparte (no
      bloqueante, fuera de alcance del spec): remitente sale como "Supabase Auth" — requiere
      SMTP propio + dominio verificado, anotado en `SPEC_Correos_Transaccionales.md`.

**Checkpoint**: T001 y T002 hechos y verificados en producción.

---

## Phase 2: Foundational (bloqueante para US4 y US6)

**Purpose**: cambios de datos/API compartidos por el Registro Básico ampliado (US4) y la Ficha
Detallada + círculo rojo (US6). US1, US2, US3 y US5 no dependen de esta fase.

- [x] T003 [P] Actualizar el tipo `Pet` local en
      `kittypau_app/src/app/(public)/login/_components/registro-flow.tsx` con `sex`,
      `microchip_number`, `birth_date`, `intake_date` (Registro Básico, ver data-model.md).
- [x] T004 [P] Actualizar el tipo `Pet` local en `kittypau_app/src/app/(app)/pet/page.tsx` con
      los 4 campos de T003 más `health_profile`, `feeding_profile`,
      `health_profile_completed_at`, `feeding_profile_completed_at`.
- [x] T005 Extender `POST /api/pets` en `kittypau_app/src/app/api/pets/route.ts`: agregar
      `sex`, `microchip_number`, `birth_date`, `intake_date` al `payload` (línea ~117-136);
      agregar `ALLOWED_SEX` (`macho`/`hembra`/`no_estoy_seguro`) y `ALLOWED_ORIGIN` (6 valores
      de la lista curada, ver spec § Assumptions) como `Set`, validados igual que
      `ALLOWED_TYPE` (línea 14, 153-155).
- [x] T006 Extender `PATCH /api/pets/[id]` en `kittypau_app/src/app/api/pets/[id]/route.ts`:
      agregar los 4 campos de T005 a `allowedFields` (línea 132-154) con la misma validación de
      enum; agregar `health_profile`, `feeding_profile`, `health_profile_completed_at`,
      `feeding_profile_completed_at` a `allowedFields` sin validación de contenido interno
      (`jsonb` de forma libre, ver contracts/pets-api.md).
- [x] T007 [P] Agregar `petDetailPending: boolean` al tipo `AppData` y calcularlo en
      `AppDataProvider` en `kittypau_app/src/lib/context/app-context.tsx` (línea 31-38 el tipo,
      línea 117-146 el cálculo) — `true` si `pets[0]?.health_profile_completed_at` o
      `feeding_profile_completed_at` es `null`/ausente. Sin fetch nuevo — reutiliza la
      respuesta de `/api/pets?limit=20` que ya se pide (línea 73).

**Checkpoint**: con T003-T007 listos, US4 y US6 tienen todo el soporte de datos que necesitan.

---

## Phase 3: User Story 1 + 2 — Verificación por correo + 3 pasos fusionados (Priority: P1) 🎯 MVP

**Goal**: registro en 3 pasos (Usuario → Mascota → Kittypau) donde el paso 1 fusiona
cuenta+perfil+nombre de mascota, y la cuenta creada exige confirmación de correo personalizada
con esos 2 nombres.

**Independent Test**: completar el registro con un email real, confirmar 3 posiciones en el
stepper, confirmar que el correo recibido trae el nombre de la persona y de la mascota en
asunto y cuerpo, confirmar que tras hacer clic en el enlace el flujo retoma en "Mascota" sin
pedir credenciales de nuevo (quickstart.md § Escenario 1).

### Implementación

- [x] T008 [US2] `stepMeta` en `page.tsx` ahora tiene 3 entradas: Usuario, Mascota, Kittypau
      (`isBrand: true`).
- [x] T009 [US2] El formulario "account" quedó fusionado en un solo `<form>` de columna única
      (Avatar → Tu Nombre → Nombre de tu Mascota → Comuna → Email → Contraseña); se retiraron
      País/Canal/dueño/WhatsApp (no vivían en este formulario, vivían en el viejo paso 2 de
      `registro-flow.tsx`, que queda intacto como fallback — ver nota de implementación).
- [x] T010 [US2] "Nombre de tu Mascota" agregado en el orden pedido; se precarga en
      `petForm.name` vía la nueva prop `initialPetName` de `RegistroFlow`.
- [x] T011 [US1] `signUp` ahora incluye `options.data: { user_name, pet_name }`; el botón
      queda deshabilitado hasta Avatar+Nombre+Mascota+Comuna+Email+Password válidos.
- [x] T012 [US1] `resendConfirmation` y los 4 flujos de resume (`onAuthStateChange`,
      `getSession`, PKCE `code`, `token_hash`) verificados — se les agregó recuperar
      `pet_name` desde `user_metadata` para que el prefill sobreviva a una pestaña nueva tras
      confirmar el correo (gap real encontrado, no estaba en el plan original, documentado acá).
- [x] T013 [US2] Círculo del paso 3 renderiza `<Image src="/logo_carga.jpg">` (32px) en vez de
      número/check; etiqueta dice "KITTYPAU". `grid-template-columns` de `.login-stepper2`
      bajado de 4 a 3 columnas (`globals.css`), y el override mobile a 2 columnas se retiró
      (3 ítems ya caben en una fila).
- [x] T014 [US2] `currentStep` de `registro-flow.tsx` no se tocó — confirmado end-to-end con
      Playwright: tras el submit fusionado, el flujo aterriza directo en "Paso 2 / 3" (Mascota)
      con el nombre de mascota precargado, sin pasar por el viejo paso "Usuario" interno.

**Nota de implementación (hallazgo real, no en el plan)**: el paso "Usuario" interno de
`registro-flow.tsx` (displayStep===1, con País/Canal/dueño/WhatsApp) NO se eliminó del código —
queda como fallback para cuentas que ya estaban a mitad de registro con el flujo viejo antes de
este cambio (su `user_onboarding_step` todavía en `user_profile`). Para cuentas nuevas queda
inalcanzable en la práctica porque `onRegister` ya deja `user_onboarding_step: "pet_profile"`
antes de montar `RegistroFlow`. Ponytail: no romper registros en curso por una limpieza
cosmética de código muerto-para-casos-nuevos-pero-vivo-para-casos-viejos.

**Checkpoint ✅ verificado con Playwright + cuenta descartable**: registro de punta a punta
funcional en 3 pasos (stepper "PASO 1/3" → "PASO 2/3", 0 errores de consola, `tsc --noEmit`
limpio). Correo personalizado (FR-014) pendiente de T002 (config manual de Supabase) para
verse en un correo real — el `options.data` ya viaja correctamente en el `signUp`. Este es el
MVP — deployable/demo-able solo con esta fase.

---

## Phase 4: User Story 4 — Registro Básico + Ficha Detallada (definición de campos) (Priority: P2)

**Goal**: el paso "Mascota" separa Registro Básico (obligatorio) de la Ficha Detallada
(mencionada pero no completada ahí — se completa en `/pet`, ver US6).

**Independent Test**: completar solo el Registro Básico y avanzar sin tocar Salud/Alimentación;
el campo de fecha cambia de etiqueta según el Origen elegido (quickstart.md § Escenario 2).

### Implementación

- [x] T015 [US4] Origen ahora con los 6 valores curados (`comprado`, `adoptado_refugio`,
      `rescatado_calle`, `regalado`, `nacido_en_casa`, `otro`) — reemplaza los 4 viejos, y el
      `ALLOWED_ORIGIN` server-side (Foundational T005/T006) valida los mismos 6.
- [x] T016 [US4] Campo "Sexo" agregado como radio buttons (Macho/Hembra/No estoy seguro) junto
      a "Especie" (Tipo renombrado a Especie en el label).
- [x] T017 [US4] Fecha condicional agregada: "Fecha de nacimiento" (`comprado`/`nacido_en_casa`)
      vs. "Fecha de llegada / adopción" (los otros 4) — limpia el campo no correspondiente al
      cambiar de Origen para no guardar una fecha en el campo equivocado.
- [x] T018 [US4] "Número de microchip" agregado, opcional, visible solo si
      `has_microchip === "true"`.
- [x] T019 [US4] Aviso "Después de esto: Salud y Alimentación" agregado antes del botón
      "Crear mascota", mencionando el nombre real de la mascota — sin construir los
      formularios acá (viven en `/pet`, Fase 5/US6).
- [x] T020 [US4] `savePet()` extendido con `sex`/`microchip_number`/`birth_date`/`intake_date`.

**Checkpoint ✅ verificado con Playwright**: Registro Básico completo y funcional — Especie,
Sexo, Origen, fecha condicional, microchip opcional, todo renderizando y guardando
correctamente; Ficha Detallada señalada como pendiente sin bloquear el avance (FR-016).

**Extra no planeado en tasks.md original**: de paso se implementaron las 7 mejoras de la
"barra de progreso" pedidas en el chat (línea conectora progresiva con gradiente coral→verde,
pop al completar un paso, ícono ⚠ en pasos con error, skeleton screen al cargar, mensaje de
submit lento, contraste de texto corregido en los dots activo/completo — antes blanco sobre
coral pastel medía ~1.8:1, ahora `#1f2937` da ~8:1). Viven en `page.tsx` (`stepperContent`,
`onStepError`, `isRegisteringSlow`) y `globals.css` (`.login-stepper2-track-fill`,
`kp-step-pop`, `.login-step2.error`). No tienen ID de tarea propio — se documentan acá para
que no se pierdan del historial.

---

## Phase 5: User Story 6 — Ficha Detallada en `/pet` + círculo rojo (Priority: P2)

**Goal**: las secciones Salud y Alimentación viven en `/pet` (editable en cualquier momento);
el ítem "Mascota" del menú muestra el círculo rojo mientras falte alguna.

**Independent Test**: con Ficha Detallada incompleta, el círculo rojo aparece en el menú;
completar Salud sola no lo apaga; completar ambas sí (quickstart.md § Escenario 3).

### Implementación

- [x] T021 [US6] Sección "Salud" agregada en `pet/page.tsx` — peso ideal, condiciones
      diagnosticadas (checkboxes guiados + "otra"), alergias, medicamentos, tratamientos,
      cirugías, vacunas, desparasitación, historial veterinario, fecha de último control.
      "Guardar sección de Salud" → `PATCH /api/pets/[id]` con `health_profile` +
      `health_profile_completed_at`. Reutiliza el helper `savePet()` que ya existía en el
      archivo para "Editar perfil".
- [x] T022 [US6] Sección "Alimentación" agregada — tipo de alimento, marca, fórmula, cantidad
      diaria, comidas/día, horarios, premios (sí/no + detalle), restricciones alimentarias.
      Mismo mecanismo que T021.
- [x] T023 [US6] Círculo rojo agregado en `app-nav.tsx` sobre el ítem "Mascota", visible
      cuando `useAppData().petDetailPending` es `true` (ya calculado en Foundational/T007).

**Checkpoint ✅ `tsc --noEmit` limpio**: Ficha Detallada completable desde `/pet` en cualquier
momento; círculo rojo refleja el estado real (FR-027). No se re-verificó en vivo contra
Supabase a pedido explícito de Mauro ("dejemos para después todo lo que tenga que ver con
Supabase") — el `PATCH` reutiliza el mismo endpoint ya extendido y probado en Foundational.

---

## Phase 6: User Story 5 — Estilo de formulario en columna única (Priority: P2)

**Goal**: los 3 pasos del registro (ya con su contenido final de las fases 3-4) pasan a
columna única, radios en vez de select para sí/no, y tamaños táctiles/tipográficos mínimos.

**Independent Test**: recorrer los 3 pasos y confirmar cero filas con 2+ campos, sí/no como
radio, inputs/botones ≥48px, texto ≥16px (quickstart.md § Escenario 4, spec § User Story 5).

### Implementación

- [x] T024 [US5] Grids convertidos a `flex flex-col gap-3` en el paso Mascota (Nombre/
      Especie/Sexo/Origen/Fecha, Físico, Salud) y en el paso Dispositivo (Mascota/Dispositivo).
      **Alcance ajustado** (decisión tomada al implementar, no en el plan original): el paso
      "Usuario" interno legacy de `registro-flow.tsx` (displayStep 1, inalcanzable para
      cuentas nuevas desde la Fase 3) y la pantalla de resumen (displayStep 4, no es un
      formulario) quedaron sin tocar — no son parte de los "3 pasos" que define la spec. Los
      pickers de imagen (avatar, tipo de dispositivo food/water) se dejaron en grid — son una
      sola pregunta con opciones visuales lado a lado, no "campos" distintos apilados.
- [x] T025 [US5] El formulario fusionado de `page.tsx` ya se construyó en columna única
      durante la Fase 3 (MVP) — nada que cambiar acá.
- [x] T026 [US5] Los 4 `<select>` sí/no (`is_neutered`, `has_neuter_tattoo`, `has_microchip`,
      `has_health_condition`) reemplazados por el nuevo componente `YesNoField` (junto a
      `FieldCard`) — radio buttons Sí/No, reutilizado 4 veces.
- [x] T027 [US5] `inputClass` a `h-12`/`text-base`; botones de submit de Mascota/Dispositivo/
      resumen a `h-12`/`text-sm`. Las etiquetas mayúsculas chicas de `FieldCard` (11px) se
      dejaron igual a propósito — es un patrón de "eyebrow label" ya establecido en toda la
      app, no el texto que la guía de UX busca agrandar (documentado en el código).
- [x] T028 [US5] Ya cubierto en la Fase 3 (MVP) — `autoComplete="email"`/`"new-password"`/
      `"name"` ya estaban en el formulario fusionado.
- [x] T029 [US5] Botones reformulados: "Crear mascota" → "Registrar a mi mascota",
      "Registrar dispositivo" → "Vincular mi dispositivo". "Crear mi cuenta" (paso 1) ya
      quedó bien desde la Fase 3.

**Checkpoint ✅ verificado con Playwright en 3 viewports** (desktop 1920×950, laptop
achicada 1366×650, tablet 700×850): columna única confirmada incluso en el ancho donde antes
pegaban los grids (700px) — cumple SC-008/SC-009.

---

## Phase 7: User Story 3 — Ajuste a pantalla (Priority: P2)

**Goal**: generalizar el scroll de respaldo que hoy solo aplica en mobile a todos los tamaños,
ahora que el contenido es más alto por la columna única (T024-T026).

**Independent Test**: en desktop grande, laptop achicada y móvil, ningún paso corta contenido
sin acceso — scroll aparece cuando hace falta (quickstart.md § Escenario 4).

### Implementación

- [x] T030 [US3] `.login-register-body-registro` pasa a `overflow-y: auto` sin condición de
      ancho; el override redundante dentro del media query mobile se retiró (solo queda el
      padding más chico ahí).
- [x] T031 [US3] Verificado con Playwright en los 3 viewports de T024 — el modal nunca excede
      el viewport, `overflow-y: auto` confirmado por `getComputedStyle`, cero errores de
      consola en ninguno de los 3 tamaños.

**Checkpoint ✅**: SC-004 cumplido en los 3 tamaños verificados.

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: cierre de la feature.

- [x] T032 [P] `tsc --noEmit` limpio, `eslint` 0 errores (62 warnings, todos pre-existentes —
      confirmados contra el mapa de warnings conocidos al inicio de `page.tsx`/
      `registro-flow.tsx`, ninguno nuevo), `next build` compila todas las rutas sin error.
- [x] T033 Escenarios 2-4 de `quickstart.md` verificados con Playwright (Registro Básico,
      círculo rojo, columna única en 3 viewports). Escenario 1 (correo real end-to-end) ya se
      había verificado en la Fase 3 con `frentecalamari@gmail.com`. Sin más pruebas nuevas
      contra Supabase en esta ronda — a pedido explícito de Mauro.
- [x] T034 `PENDIENTES_POR_PC.md` actualizado (este mismo cierre).
- [x] T035 [P] `DOC_MAESTRO_DOMINIO.md` § 6 actualizado — registro fusionado en 3 pasos y el
      mecanismo del círculo rojo documentados.

**002-registro-flow-unificado: las 8 fases completas (35/35 tareas, T002 manual ya aplicada
por Mauro).**

---

## Dependencies & Execution Order

- **Setup (Fase 1)**: T001 ya hecho. T002 es manual, no bloquea código, sí bloquea la
  verificación completa de US1 en producción.
- **Foundational (Fase 2)**: bloquea Fase 4 (US4) y Fase 5 (US6) — no bloquea Fase 3 (US1+US2),
  Fase 6 (US5) ni Fase 7 (US3).
- **Fase 3 (US1+US2, P1, MVP)**: puede empezar apenas termine el Setup — es el primer
  incremento entregable.
- **Fase 4 (US4)** depende de Fase 2 (T003-T007) y conceptualmente de que exista el paso
  Mascota (ya existe hoy, Fase 3 no lo toca de fondo).
- **Fase 5 (US6)** depende de Fase 2 (T005-T007) y de Fase 4 (usa los mismos campos de
  `pets` que Fase 4 termina de exponer en la API).
- **Fase 6 (US5)** depende de que el JSX de los 3 pasos esté en su forma final — es decir,
  después de Fase 3 y Fase 4 (para no rehacer el layout dos veces).
- **Fase 7 (US3)** depende de Fase 6 (el CSS de scroll se generaliza sabiendo cómo queda la
  columna única).
- **Fase 8 (Polish)**: al final, depende de todas las anteriores.

### Oportunidades de paralelismo

- T003/T004 (tipos) y T007 (contexto) son `[P]` entre sí dentro de la Fase 2.
- T028/T029 (autocomplete, copy de botones) son `[P]` entre sí dentro de la Fase 6.
- T032/T035 son `[P]` entre sí en la Fase 8.

## Implementation Strategy

**MVP = Fase 1 + Fase 2 (parcial, solo lo que Fase 3 necesite) + Fase 3.** Con eso ya hay un
registro de 3 pasos con verificación de correo personalizada, que es el pedido original de
Mauro antes de las historias 4-6. Las fases 4-7 son incrementos que se pueden entregar y
demostrar por separado, en el orden ya justificado arriba.
