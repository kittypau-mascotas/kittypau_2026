---

description: "Task list template for feature implementation"
---

# Tasks: Calibración Automática del Peso del Plato (por Tara)

**Input**: Design documents from `Knowledge/29_Specs/005-calibracion-peso-plato/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (todos ya generados)

**Tests**: Test unitario de la función de umbral de confirmación (Vitest) — ver `research.md` § Testing. Sin test end-to-end contra hardware real (no hay mocks de MQTT/firmware en el proyecto).

**Organization**: Tareas agrupadas por user story de `spec.md` (US1 = P1 tara exitosa, US2 = P2 repetir, US3 = P3 alternativa manual). Fase Foundational cubre el reordenamiento del paso 3 en 2 sub-pasos — bloqueante para las 3 historias porque ninguna calibración puede empezar sin un dispositivo ya vinculado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias)
- **[Story]**: a qué user story pertenece (US1, US2, US3)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único (Next.js App Router) — rutas relativas a `kittypau_app/`.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Reordenar el paso 3 del registro en 2 sub-pasos (vincular → calibrar) y crear la función de umbral de confirmación — sin esto ninguna user story puede implementarse (ver `research.md` § Orden real de los pasos).

**⚠️ CRITICAL**: Ninguna user story empieza hasta que esta fase esté completa.

- [X] T001 En `kittypau_app/src/app/(public)/login/_components/registro-flow.tsx`, separar el envío de `saveDevice` (~línea 934-948) en 2 sub-pasos dentro del mismo paso 3 visible: (a) "Vincular" — `POST /api/devices` con `pet_id`, `device_uuid`, `device_type`, `status`, **sin** `plate_weight_grams` — deja el dispositivo creado con ese campo `null`; (b) un nuevo estado local (ej. `deviceLinkedId`) que marca que ya existe un dispositivo real y habilita el sub-paso de calibración. El formulario deja de ser un único submit atómico. — `saveDevice` se separó en `linkDevice()` (crea el dispositivo) y `finishDeviceStep()` (antes era la cola de `saveDevice`: marcar onboarding completo + redirigir), con `linkedDeviceId` como el estado nuevo
- [X] T002 [P] Crear `kittypau_app/src/lib/utils/plate-tare-check.ts`: función pura `isTareConfirmed(weightGrams: number, thresholdGrams?: number): boolean` — usa un umbral pequeño por defecto (mismo orden de magnitud que el deadband de 2g ya documentado en `Knowledge/07_MQTT/README_MQTT.md`), y `plate-tare-check.test.ts` con casos: 0 exacto, dentro del umbral, fuera del umbral (positivo y negativo) — umbral por defecto `TARE_CONFIRM_THRESHOLD_G = 5`
- [X] T003 Correr `cd kittypau_app && npm run test -- plate-tare-check` y confirmar que T002 pasa — 5/5 tests pasan

**Checkpoint**: paso 3 reestructurado en 2 sub-pasos, función de umbral lista — las 3 historias pueden implementarse.

---

## Phase 2: User Story 1 - Calibrar el plato haciendo tara en vivo (Priority: P1) 🎯 MVP

**Goal**: Tras vincular el dispositivo (T001), aparece la secuencia guiada de 4 pasos (conexión → plato → tara → confirmación) y, si todo sale bien, confirma que el dispositivo quedó en cero.

**Independent Test**: Escenario 1 de `quickstart.md` — con hardware real, vincular un dispositivo nuevo, seguir la secuencia guiada colocando el plato vacío, y confirmar que el resultado llega antes de 15 segundos y da ~0.

### Implementation for User Story 1

- [X] T004 [US1] En `registro-flow.tsx`, agregar el componente/bloque de la secuencia guiada (estado local con los 7 valores de `data-model.md`: `esperando_conexion`, `listo_para_plato`, `tarando`, `confirmando`, `exitoso`, `fallido`, `manual`), mostrado solo tras completar T001 (sub-paso "Vincular" ya hecho)
- [X] T005 [US1] Implementar el chequeo de conexión inicial (`esperando_conexion` → `listo_para_plato`): confirmar que el dispositivo recién vinculado está enviando datos antes de ofrecer empezar — reutiliza `DEVICE_ONLINE_THRESHOLD_MS` (`@/lib/device-diagnostics`, mismo umbral que `getConnectionHint`) sobre el `last_seen` devuelto por el propio `POST /api/devices`
- [X] T006 [US1] Al pasar a `tarando`: enviar `POST /api/devices/{id}/interval` con un `value_ms` bajo (ej. 2000, dentro del mínimo de 1000ms ya validado por el endpoint) para acelerar la publicación de `SENSORS` durante la prueba (ver `research.md` § Acelerar el intervalo)
- [X] T007 [US1] Inmediatamente después de T006, enviar `POST /api/devices/{id}/tare` (endpoint ya existente, sin cambios)
- [X] T008 [US1] Suscribirse a Supabase Realtime (`postgres_changes`, evento `INSERT`, tabla `readings`, filtro por el `device_id` del dispositivo recién vinculado) para recibir la primera lectura posterior al envío de la tara — mismo patrón que `kittypau_app/src/app/(app)/bowl/page.tsx` líneas ~436-467 (canal + `supabase.realtime.setAuth`) — **sin fallback de polling** (simplificación deliberada marcada `ponytail:` en el código, ver Notes)
- [X] T009 [US1] Al llegar la lectura de confirmación: pasar a `confirmando`, evaluar con `isTareConfirmed()` (T002); si es `true`, pasar a `exitoso` y mostrar el mensaje de confirmación ("listo, ahora tenemos el peso de tu plato" o equivalente) — implementado en `handleTareReading()`
- [X] T010 [US1] Al terminar la secuencia (éxito, fallo, o abandono), restaurar el intervalo de `SENSORS` a su valor normal con otro `POST /api/devices/{id}/interval` — incluir esto también como limpieza en el `useEffect` de desmontaje del componente de la secuencia, no solo en el camino feliz (ver riesgo señalado en `research.md`) — `restoreNormalInterval()` + `useEffect` de cleanup al desmontar
- [X] T011 [US1] Confirmar que `devices.plate_weight_grams` queda `null` tras un `exitoso` (no se envía ningún PATCH adicional — ya es el valor por defecto de una fila recién creada en T001) — verificado: `linkDevice()` nunca manda `plate_weight_grams` en el POST

**Checkpoint**: la secuencia de tara funciona de punta a punta en el camino feliz — MVP entregable acá.

---

## Phase 3: User Story 2 - Repetir la prueba si algo salió mal (Priority: P2)

**Goal**: Si la confirmación no llega, no es válida, o el dispositivo se desconecta a mitad de la secuencia, se ofrece repetir desde "colocar el plato" en vez de trabarse o dar una tara dudosa por buena.

**Independent Test**: Escenario 2 de `quickstart.md` — mover/retirar el plato durante la medición, o cortar la conexión del dispositivo, y confirmar que se ofrece repetir la secuencia completa.

### Implementation for User Story 2

- [X] T012 [US2] En el estado `tarando`/`confirmando` de T009, agregar un timeout (ej. 15-20s, coherente con SC-001) — si no llega ninguna lectura de confirmación en ese plazo, pasar a `fallido` en vez de esperar indefinidamente — `TARE_CONFIRM_TIMEOUT_MS = 15_000`, `window.setTimeout` en `startTareSequence()`
- [X] T013 [US2] Si `isTareConfirmed()` (T002) evalúa `false` sobre la lectura recibida, pasar a `fallido` en vez de `exitoso` — mostrar que el resultado no fue válido
- [~] T014 [US2] Detectar desconexión del dispositivo antes de iniciar la secuencia (reutilizando T005) y también durante la espera de confirmación (ej. si `last_seen` no avanza) — pasar a `fallido` con un mensaje distinto ("dispositivo sin conexión") en vez del genérico de lectura inválida — **parcial**: la desconexión ANTES de iniciar sí se detecta (T005). La desconexión A MITAD de la espera de confirmación no se distingue del timeout genérico de T012 (mismo mensaje "no llegó confirmación a tiempo") — simplificación deliberada, ver Notes
- [X] T015 [US2] Desde `fallido`, ofrecer un botón que vuelve a `listo_para_plato` (repetir la secuencia completa desde "colocar el plato", no solo re-leer) — sin perder el resto de los datos ya completados en el paso de vinculación (pet_id, device_type ya guardados en T001) — `retryTareSequence()`

**Checkpoint**: US1 y US2 cubren el camino feliz y su red de seguridad — funcionan juntas de punta a punta.

---

## Phase 4: User Story 3 - Alternativa manual si la prueba no es viable (Priority: P3)

**Goal**: Quien no puede o no quiere hacer la prueba automática en este momento puede seguir ingresando el peso del plato a mano, igual que el comportamiento previo a este feature.

**Independent Test**: Escenario 3 de `quickstart.md` — elegir la alternativa manual (o agotar los reintentos de US2) y confirmar que el registro se completa con el valor escrito, sin intentar ninguna tara.

### Implementation for User Story 3

- [X] T016 [US3] En `registro-flow.tsx`, reincorporar el `<input type="number">` de "Peso del plato (g)" que existía antes de T001 (~línea 2005-2041 del estado previo a este feature) como camino alternativo dentro del bloque de la secuencia guiada — visible desde el inicio como opción ("Prefiero ingresarlo a mano") y ofrecido explícitamente al llegar a `fallido` tras agotar los reintentos de US2 — estado `showManualPlateInput`, ofrecido desde `listo_para_plato` y desde `fallido`
- [X] T017 [US3] Al confirmar el valor manual, enviar `PATCH /api/devices/{id}` con `plate_weight_grams` (endpoint ya existente, sin cambios) en vez de ejecutar cualquier tara — pasar el estado local a `manual` y continuar el registro con normalidad — `submitManualPlateWeight()`
- [X] T018 [US3] Confirmar que elegir el camino manual nunca dispara `POST /api/devices/{id}/tare` ni `POST /api/devices/{id}/interval` — son caminos mutuamente excluyentes dentro de la misma secuencia — verificado por inspección: `submitManualPlateWeight()` solo llama al PATCH, ninguna otra función

**Checkpoint**: las 3 user stories completas — nadie queda bloqueado en el paso de vinculación de dispositivo.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Resguardo no-negociable de FR-009 y verificación final.

- [X] T019 Resguardo de FR-009: antes de mostrar la secuencia guiada (T004), verificar que el dispositivo recién vinculado (T001) no tiene ninguna lectura propia en `readings` todavía (consulta simple, límite 1 fila) — si por algún motivo ya tuviera lecturas, no ofrecer la secuencia de tara (esto no debería poder pasar en el flujo normal, ver `research.md` § Cómo garantizar..., pero es la salvaguarda barata that lo hace explícito en el código) — chequeo `GET /api/readings?device_id={id}&limit=1` dentro de `linkDevice()`, cae a `fallido` + camino manual si encuentra lecturas previas
- [X] T020 [P] Correr `cd kittypau_app && npx tsc --noEmit` y `npx eslint "src/app/(public)/login/_components/registro-flow.tsx" "src/lib/utils/plate-tare-check.ts" "src/lib/utils/plate-tare-check.test.ts"` — confirmar 0 errores — **0 errores** (13 warnings preexistentes no relacionadas)
- [X] T021 [P] Correr `cd kittypau_app && npm run build` — confirmar que la ruta `/registro` sigue compilando sin errores tras el reordenamiento del paso 3 — **build exit 0**, `/registro` compila
- [ ] T022 Ejecutar los 4 escenarios de `quickstart.md` contra un dispositivo Kittypau real (click-through + hardware — no automatizable desde un entorno sin el dispositivo físico conectado) — **NO ejecutado**: hay hardware disponible (KPCL0036) pero requiere interacción física (colocar el plato) que no puedo hacer. Ver instrucciones en Notes para correrlo con KPCL0036.

---

## Phase 6: User Story 4 - Confirmación visual de que la vinculación quedó lista (Priority: P2)

**Agregado tras probar con hardware real KPCL0036** — reemplaza el toast+redirect automático de `finishDeviceStep` por una pantalla de cierre dedicada.

- [X] T023 [US4] En `registro-flow.tsx`: agregar estado `showLinkCelebration`, cambiar `finishDeviceStep` para que muestre esa pantalla en vez de `showSavedToastAndRedirect(true)`, y agregar `closeLinkCelebration()` (cierra el popup vía `onClose` + navega a `entryPath`).
- [X] T024 [US4] Construir la pantalla de cierre: overlay a pantalla completa dentro del popup, triángulo SVG animado (framer-motion, ya dependencia del proyecto) con el logo de Kittypau en la punta de arriba y las fotos/nombres de usuario y mascota en las dos bases, mensaje "¡Terminaste la vinculación!" y botón "Cerrar".
- [X] T025 [P] Correr `npx tsc --noEmit` y `npx eslint "src/app/(public)/login/_components/registro-flow.tsx"` — 0 errores.
- [X] T026 [P] Correr `npm run build` — confirmar que `/registro` sigue compilando.
- [ ] T027 Validar visualmente con KPCL0036 (junto con T022) que la pantalla de cierre aparece con las fotos/nombres correctos y que "Cerrar" lleva al `/today` de la cuenta.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sin dependencias — BLOQUEA a US1, US2 y US3 (las 3 necesitan el dispositivo ya vinculado antes de poder calibrar, y US2/US3 dependen de la máquina de estados que T004 define).
- **User Story 1 (Phase 2)**: depende de Foundational. Es el camino feliz — MVP.
- **User Story 2 (Phase 3)**: depende de Foundational y de la máquina de estados de US1 (T004, T009) — no es independiente de US1 en la práctica, aunque conceptualmente sea "la red de seguridad" de la misma secuencia.
- **User Story 3 (Phase 4)**: depende de Foundational. Puede implementarse en paralelo con US1/US2 (toca principalmente la reincorporación del input manual y el `PATCH`), pero su gatillo más natural ("ofrecer tras agotar reintentos", T016) depende de que `fallido` (US2) ya exista.
- **Polish (Phase 5)**: depende de que US1, US2 y US3 estén completas — T019 en particular debe ir antes de dar el feature por terminado (no-negociable).

### Parallel Opportunities

- T002 (función de umbral) es paralelizable respecto a T001 (reordenamiento del formulario) — archivos distintos.
- T020 y T021 (verificación final) son paralelas entre sí.
- US3 (Phase 4) puede empezarse en paralelo con US2 (Phase 3) por 2 personas distintas, dado que ambas dependen de Foundational pero no una de la otra en el código (aunque conceptualmente US3 se activa cuando US2 falla repetidamente).

---

## Parallel Example: Foundational

```bash
# En paralelo:
Task: "Reordenar paso 3 en 2 sub-pasos en registro-flow.tsx (T001)"
Task: "Crear plate-tare-check.ts + test (T002-T003)"
```

---

## Implementation Strategy

### MVP First (Foundational + User Story 1)

1. Phase 1 (Foundational) — paso 3 reordenado, función de umbral lista.
2. Phase 2 (US1) — secuencia de tara, camino feliz completo.
3. **Parar y validar**: Escenario 1 de `quickstart.md` contra hardware real. Ya demuestra el pedido central.

### Entrega incremental

1. Foundational → paso 3 reordenado.
2. + US1 → tara exitosa funciona → validar con hardware real.
3. + US2 → repetir si falla → validar.
4. + US3 → alternativa manual → validar.
5. + Polish → resguardo FR-009 + verificación final.

---

## Notes

- Sin tabla de Complexity Tracking que traer de `plan.md` — no hubo violaciones de constitución.
- Ninguna tarea toca firmware ni el protocolo MQTT — todos los comandos (`CALIBRATE_WEIGHT`, `SET_INTERVAL`) y endpoints ya existen tal cual.
- Ninguna tarea toca `today/page.tsx` ni ningún otro cálculo de contenido — su manejo de `plate_weight_grams = null` ya es correcto (ver `research.md`).
- Ninguna tarea toca `contracts/` — no existe esa carpeta para este feature (todos los endpoints ya existían).
- **Simplificaciones deliberadas marcadas `ponytail:` en el código** (ver también T008/T014 arriba):
  1. Sin fallback de polling para la confirmación — solo Supabase Realtime. Si en la
     prueba con KPCL0036 se ve que Realtime tarda en conectar o falla seguido, el
     upgrade path ya está documentado en `research.md` (mismo `/api/readings` que usa
     `bowl/page.tsx` como fallback).
  2. Desconexión a mitad de la espera de confirmación no se distingue del timeout
     genérico — mismo mensaje. Si en la prueba real esto genera confusión, separar
     ambos casos consultando `last_seen` otra vez al vencer el timeout.

### Cómo correr T022 con KPCL0036 (pendiente, requiere interacción física)

1. `cd kittypau_app && npm run dev`, abrir el registro con una cuenta de prueba nueva
   (sin dispositivos vinculados).
2. Completar el paso 1 (Usuario) y el paso 2 (Mascota).
3. En el paso 3 (Dispositivo), elegir KPCL0036 en el picker y el tipo (comida o agua,
   según corresponda a cómo esté armado KPCL0036 ahora mismo).
4. Clic en "Vincular mi dispositivo" — **Esperado**: aparece la tarjeta "Calibrar el
   peso de tu plato" con "Verificando conexión...".
5. Si KPCL0036 está encendido y conectado — **Esperado**: pasa solo a "Kittypau
   listo. Agrega el plato...".
6. Colocar el plato vacío sobre KPCL0036, clic en "Ya coloqué el plato".
7. **Esperado**: "Pesando plato......" y, en menos de ~15 segundos, "Listo — ahora
   tenemos el peso de tu plato." (Escenario 1 de `quickstart.md`).
8. Repetir moviendo el plato a mitad de la espera, para probar el Escenario 2
   (debería caer a "fallido" con opción de repetir, no colgarse ni dar un falso
   éxito).
9. En cualquier punto, probar "Prefiero ingresarlo a mano" / "Ingresarlo a mano"
   para el Escenario 3.
10. Tras un `exitoso`, verificar en `/bowl` o `/today` (con otra cuenta/sesión con
    acceso a ese dispositivo, o revisando Supabase directo) que `plate_weight_grams`
    quedó `null` para KPCL0036, y que una lectura con solo el plato puesto (sin nada
    más) muestra ~0 g de contenido.
