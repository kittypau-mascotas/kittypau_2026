# Tasks: Widget de Android — mini-hero de la mascota

**Input**: Design documents from `Knowledge/29_Specs/010-widget-android-hero/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Nota de entorno (research.md Decisión 0)**: este entorno de Claude Code no tiene
`java`/Android SDK — cada tarea está marcada **(Fase A)** si es TypeScript/Next.js
(implementable y verificable acá con `npm run test`/`tsc`/`eslint`/`next build`) o **(Fase B)**
si es Kotlin/XML/Gradle (código completo y correcto, pero solo compilable/verificable en la PC
de Mauro — `gradlew`, `cap sync android`, dispositivo real).

**Tests**: la única superficie con test automatizado real en este feature es la extensión del
endpoint (Vitest, patrón ya existente en `route.test.ts`). El proyecto no tiene tests
instrumentados de Android hoy — no se inventan para este feature (fuera del ladder de Ponytail
para un equipo de 2 personas); la verificación de la parte nativa es manual, vía
`quickstart.md`.

**Organization**: tareas agrupadas por user story (spec.md), en orden de prioridad P1→P2→P3.

## Format: `[ID] [P?] [Story] Descripción (Fase A|B)`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué user story pertenece (US1/US2/US3)

---

## Phase 1: Setup

**Purpose**: declarar las dependencias nuevas y la estructura de carpetas, sin lógica todavía.

- [x] T001 [P] Agregar `@capacitor/preferences` a `kittypau_app/package.json` (research.md
  Decisión 4) (Fase A — `npm install` corre acá; el uso real del plugin nativo es Fase B)
- [x] T002 [P] Declarar `androidx.glance:glance-appwidget` en
  `kittypau_app/android/app/build.gradle` (research.md Decisión 1) (Fase B)
- [x] T003 [P] Verificar si `androidx.work:work-runtime-ktx` ya viene transitiva con
  `@capacitor/android` 8.5.0 -- confirmado que NO (grep sin resultados en
  `node_modules/@capacitor/android/capacitor/build.gradle`, no hace falta esperar a
  `./gradlew :app:dependencies` en la PC de Mauro para saberlo); declarada en
  `kittypau_app/android/app/build.gradle` (research.md § Resumen de dependencias) (Fase B)
- [x] T004 [P] Crear el paquete `kittypau_app/android/app/src/main/java/com/kittypau/app/widget/`
  (estructura vacía para las clases de las fases siguientes) (Fase B)

**Checkpoint**: dependencias declaradas — no bloquea el arranque de Foundational (T005-T008
no dependen de que T002/T003 estén compiladas, solo declaradas).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el dato de agua que TODAS las user stories necesitan tiene que existir server-side
antes de que el widget (cualquier historia) pueda leerlo.

**⚠️ CRITICAL**: ninguna user story puede darse por completa sin esta fase.

- [x] T005 Portar el cálculo de `water%` desde
  `kittypau_app/src/app/(app)/today/_components/today-screen.tsx`
  (`waterContentWeightGrams`/`waterMaxServedContentMl`/`waterWellness`) a
  `kittypau_app/src/lib/hunger-bar-server.ts` como `resolveWaterDevice()` + función de cálculo
  hermana de `resolveFoodDevice()` (data-model.md §3, research.md Decisión 3) (Fase A)
- [x] T006 Incluir el objeto `water` (`{ status, percentage, hasEvidence, lastEventLabel,
  lastEventAt }`) en `buildHungerBarPayload()` de `hunger-bar-server.ts`, consumido sin cambios
  adicionales por `kittypau_app/src/app/api/pets/[id]/hunger-bar/route.ts`
  (contracts/hunger-bar-water-extension.md) (Fase A) — depende de T005
- [x] T007 [P] Extender
  `kittypau_app/src/app/api/pets/[id]/hunger-bar/route.test.ts` con los casos nuevos de `water`
  (sin dispositivo, sin evidencia, con evento confirmado — contracts/hunger-bar-water-extension.md
  § Testing) (Fase A) — depende de T006
- [x] T008 Correr `npm run test` dentro de `kittypau_app` y confirmar que todo pasa, incluidos
  los casos nuevos de T007 (Fase A) — depende de T007
- [x] T009 [P] Registrar en `kittypau_app/android/app/src/main/AndroidManifest.xml` los
  componentes que las fases siguientes van a crear:
  `KittypauHeroWidgetReceiver` (`<receiver>` con `APPWIDGET_UPDATE` + meta-data apuntando al
  XML de T012), `WidgetPetConfigActivity` (`<activity>`), y `KittypauWidgetPlugin` (registro de
  plugin Capacitor) (Fase B)

**Checkpoint**: el dato de agua ya existe y está verificado (T008 verde). El widget puede
apoyarse en él sin recalcular nada.

---

## Phase 3: User Story 1 - Ver el estado de mi mascota sin abrir la app (Priority: P1) 🎯 MVP

**Goal**: agregar el widget desde un botón dentro de la app (objetivo explícito de Mauro) y
verlo mostrar foto/barras/círculos/horas reales de la mascota elegida.

**Independent Test** (quickstart.md Paso 3): tocar "Agregar widget" al final del feed de `/today`, elegir una
mascota en la configuration Activity, y comparar cada valor del widget contra `/today` para esa
misma mascota en el mismo momento.

### Implementation for User Story 1

- [x] T010 [US1] Crear
  `kittypau_app/android/app/src/main/res/xml/kittypau_hero_widget_info.xml`
  (`AppWidgetProviderInfo`, grilla 2×4, `android:configure` apuntando a
  `WidgetPetConfigActivity` de T013) (Fase B)
- [x] T011 [US1] Crear `KittypauHeroWidgetReceiver.kt`
  (`GlanceAppWidgetReceiver`) en `.../widget/`, incluyendo `onDeleted(appWidgetId)` que limpia
  la configuración de `SharedPreferences` (data-model.md §1, Edge Case "quitar y volver a
  agregar") (Fase B) — depende de T009, T010
- [x] T012 [US1] Crear `KittypauHeroWidget.kt` (composable Glance): estado normal (foto con
  fallback, barra de comida esmeralda, barra de agua sky, círculo de comida con número+ícono
  detrás con contraste, círculo de agua solo ícono sin número — FR-006, dos textos chicos de
  última hora con "sin registro hoy" cuando corresponda — FR-015) y estado "sin dispositivo
  asignado" (FR-016, mismo criterio honesto que `/today`) (Fase B) — depende de T011
- [x] T013 [US1] Crear `WidgetPetConfigActivity.kt`: lista las mascotas de la cuenta (`GET
  /api/pets`, ya existente), al elegir una guarda `{ petId, petName, petPhotoUrl }` en
  `SharedPreferences` por `appWidgetId` (data-model.md §1) y llama
  `setResult(RESULT_OK)` + `finish()` (Fase B) — depende de T010
- [x] T014 [US1] Crear `KittypauWidgetPlugin.kt` (`@CapacitorPlugin`, método `requestPin()` que
  chequea `isRequestPinAppWidgetSupported` y llama `requestPinAppWidget()` —
  contracts/widget-pin-plugin.md) en `kittypau_app/android/app/src/main/java/com/kittypau/app/`
  (Fase B) — depende de T009, T011
- [x] T015 [US1] Crear `kittypau_app/src/lib/hooks/useAddWidgetToHomeScreen.ts`: import
  dinámico de `@capacitor/core`, no-op si `!Capacitor.isNativePlatform()`, llama al plugin de
  T014 y devuelve `{ supported }` — mismo patrón de
  `kittypau_app/src/lib/hooks/usePushTokenRegistration.ts` (Fase A — se escribe y tipa acá; su
  llamada real al plugin nativo solo funciona en runtime una vez T014 esté compilado)
- [x] T016 [US1] Agregar botón "Agregar widget a tu pantalla de inicio" a la pantalla
  al final del feed de `/today` (`kittypau_app/src/app/(app)/today/_components/today-screen.tsx`), no en `/settings`,
  visible solo en modo APK nativo (mismo criterio `isNativeApkMode` que
  `kittypau_app/src/app/_components/app-nav.tsx`), con el mensaje instructivo de fallback
  cuando `supported: false` (contracts/widget-pin-plugin.md § UI) (Fase A) — depende de T015
- [x] T017 [US1] `tsc` + `eslint` + `next build` limpios sobre todo lo de Fase A tocado hasta
  acá (Fase A) — depende de T016

**Checkpoint**: US1 completa del lado Fase A (verificable acá). Fase B queda como código
completo pendiente de `cap sync android` + `gradlew assembleDebug` + prueba en dispositivo en
la PC de Mauro (quickstart.md Pasos 2-3).

---

## Phase 4: User Story 2 - El widget se actualiza solo (Priority: P2)

**Goal**: refresco automático sin abrir la app, distinguiendo "sin conexión momentánea" de
"sesión inválida".

**Independent Test** (quickstart.md Paso 4): provocar un evento real de comida/agua y verificar
que el widget lo refleja solo, dentro de la ventana de 30 min.

### Implementation for User Story 2

- [x] T018 [US2] Crear `WidgetAuthBridge.kt`: lee el refresh token desde
  `@capacitor/preferences` (`SharedPreferences` plano, sin encripción -- verificado, research.md
  Decisión 4), lo canjea contra
  `POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, y expone el resultado como uno
  de `Autenticado` / `SinConexión` / `SesiónInválida` según research.md Decisión 6 (Fase B) —
  depende de T004
- [x] T019 [US2] Crear `WidgetRefreshWorker.kt` (`CoroutineWorker` + `PeriodicWorkRequest`,
  piso real de 15 min): para cada `appWidgetId` configurado, usa T018 para obtener un access
  token, pega a `GET /api/pets/:id/hunger-bar` (con el `water` de la Fase Foundational), y
  actualiza el snapshot cacheado (data-model.md §5) o lo limpia si el estado es
  `SesiónInválida` (Fase B) — depende de T012, T018
- [x] T020 [US2] Registrar el enqueue de `WidgetRefreshWorker` (único, `KEEP` policy) en
  `KittypauHeroWidgetReceiver.onUpdate()`/`onEnabled()` (Fase B) — depende de T011, T019
- [x] T021 [US2] Actualizar `KittypauHeroWidget.kt` (T012) para pintar el estado "offline,
  último dato conocido" (FR-010, sin marca visual agresiva — sigue siendo el dato real más
  reciente) y el estado neutro "Iniciá sesión para ver a tu mascota" (FR-014) según lo que deja
  `WidgetRefreshWorker` en el snapshot cacheado (Fase B) — depende de T012, T019
- [x] T022 [P] [US2] (Opcional, no bloqueante para SC-002 — research.md Decisión 5) `src/lib/push/fcm.ts`
  (`sendPushToTokens`, único caller real: el cron de `notify-meal-events`) manda `data:
  { kittypau_widget_refresh: "1" }` junto al push existente (Fase A). Del lado nativo,
  `KittypauMessagingService.kt` extiende la `MessagingService` de `@capacitor/push-notifications`
  (llama `super.onMessageReceived()` primero -- el push "comió"/"le sirvieron" sigue intacto),
  chequea ese data-flag y dispara `WidgetRefreshWorker.enqueueImmediate()`; `AndroidManifest.xml`
  reemplaza el `<service>` del plugin por el propio (mismo `android:name` original removido con
  `tools:node="remove"`, único `FirebaseMessagingService` permitido por app) (Fase B) — sigue
  bloqueado por lo mismo que todo el push hoy: credenciales de Firebase de Mauro
  (`008-push-notifications-fcm/plan.md`), no por este feature

**Checkpoint**: refresco automático completo — SC-002 se cumple solo con T019 (15 min < 30 min
del criterio), T022 es una mejora de latencia, no un requisito para cerrar la historia.

---

## Phase 5: User Story 3 - Ir al detalle completo desde el widget (Priority: P3)

**Goal**: tocar el widget abre `/today` de la mascota correspondiente (o el login, si la
sesión no es válida).

**Independent Test** (quickstart.md Paso 5): tocar el widget con sesión válida → abre `/today`
de esa mascota; con sesión inválida → abre el login.

### Implementation for User Story 3

- [x] T023 [US3] Agregar la acción de tap en `KittypauHeroWidget.kt` (T012):
  `actionStartActivity` hacia `MainActivity` con un extra (`petId` + ruta objetivo `/today`)
  cuando el estado es `Autenticado`, o hacia la pantalla de login cuando es `SesiónInválida`
  (Fase B) — depende de T012, T021
- [x] T024 [US3] Antes de escribir código nuevo, revisar si `MainActivity`/el plugin `App` de
  Capacitor ya maneja deep links entrantes (buscar `appUrlOpen`/`android:launchMode` en
  `AndroidManifest.xml` y `MainActivity.java` existentes — ladder Ponytail paso 2). Si no
  existe, agregar el manejo mínimo para navegar el WebView a `/today?petId=...` al recibir el
  intent de T023 (Fase B, o Fase A si el manejo termina viviendo en un listener JS de
  `App.addListener('appUrlOpen', ...)`) — depende de T023

**Checkpoint**: las 3 user stories funcionales de punta a punta (Fase B pendiente de build real
en la PC de Mauro para las 3).

---

## Phase Final: Polish & Cross-Cutting Concerns

- [ ] T025 [P] Correr `quickstart.md` completo (Pasos 1-6) en la PC de Mauro una vez que la
  Fase B esté compilada, y actualizar `Knowledge/19_DevOps/PENDIENTES_POR_PC.md` con el
  resultado real (qué pasó, qué quedó pendiente)
- [x] T026 [P] Actualizar `Knowledge/29_Specs/SPEC_06_Mobile_APK_2026.md` § "Evaluado y
  descartado por ahora" — el widget dejó de estar pospuesto, reflejar el estado real
  (implementado / en progreso) para que no quede desactualizado
- [x] T027 Revisión final de lectura de todo el código Fase B (Kotlin/XML) — sintaxis, imports,
  nombres de paquete consistentes con `com.kittypau.app` — antes de que Mauro lo compile por
  primera vez, para minimizar idas y vueltas de errores de compilación triviales

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — arranca de inmediato.
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA las 3 user stories (el dato de agua es
  compartido por todas).
- **User Story 1 (Phase 3)**: depende de Foundational. Es el MVP — sin esto no hay widget.
- **User Story 2 (Phase 4)**: depende de Foundational + de que el widget de US1 exista para
  tener algo que refrescar (T019 depende de T012).
- **User Story 3 (Phase 5)**: depende de que US2 exista para saber distinguir sesión
  válida/inválida al tocar (T023 depende de T021).
- **Polish (Final)**: depende de que las historias que se prioricen estén completas.

### Dentro de cada Fase A/B

- Fase A de este feature es un subconjunto chico y acotado (T001, T005-T008, T015-T017, T022
  parcial) — se puede completar y verificar de punta a punta en este entorno sin esperar nada
  de Fase B.
- Fase B (todo lo Kotlin/XML/Gradle) se puede escribir completo en este entorno pero su
  verificación real (compilación + dispositivo) depende de la PC de Mauro — no bloquea que
  Fase A quede terminada y probada mientras tanto.

### Parallel Opportunities

- T001-T004 (Setup) en paralelo.
- T007 puede escribirse en paralelo a T006 solo si se define el shape del contrato primero
  (ya está en contracts/hunger-bar-water-extension.md) — en la práctica, secuencial con T006.
- T009 (manifest) en paralelo a T005-T008 (son archivos distintos, sin dependencia real entre
  sí más allá de compartir el feature).
- T022 (cron, Fase A del lado servidor) en paralelo a cualquier tarea de US2 de Fase B.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Setup (T001-T004) + Foundational (T005-T009).
2. Completar Fase A de US1 (T015-T017) — queda verificado acá.
3. Entregar el código de Fase B de US1 (T010-T014) a la PC de Mauro para compilar y probar
   (quickstart.md Pasos 2-3).
4. **STOP y VALIDAR**: con el widget agregado y mostrando datos reales, el feature ya entrega
   el valor central ("ver el % del hunger bar sin abrir la app" + el botón in-app que pidió
   Mauro).

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → MVP funcional (agregar + ver, sin auto-refresco todavía — sirve para el momento en que
   se agrega, se desactualiza después).
3. US2 → el widget deja de ser una foto fija, se mantiene solo.
4. US3 → atajo de conveniencia hacia el detalle completo.

Cada historia es un incremento de valor real y no rompe la anterior — mismo criterio que el
resto de los specs del proyecto.
