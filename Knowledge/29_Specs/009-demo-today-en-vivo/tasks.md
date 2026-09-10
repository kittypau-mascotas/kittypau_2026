---
description: "Task list — Demo /today en vivo con identidad del visitante"
---

# Tasks: Demo /today en vivo con identidad del visitante

**Input**: Design documents from `Knowledge/29_Specs/009-demo-today-en-vivo/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Solo se pidió explícitamente **un** test de contrato (`route.test.ts` para `/api/demo/today`,
ver quickstart "Checklist de release"). El resto se valida con quickstart.md manual + `vitest` de
rutas ya existente. No hay TDD general.

**Organización**: por user story (US1 P1 · US2 P2 · US3 P3 · US4 P3). Todas las rutas son relativas
a la raíz del repo; el código vive en `kittypau_app/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivo distinto, sin dependencia pendiente)
- **[Story]**: US1/US2/US3/US4 (fases de historia); Setup/Foundational/Polish sin label

---

## Phase 1: Setup

**Purpose**: preparación de entorno y protocolo de repo.

- [X] T001 Agregar variables del dispositivo de demo a `kittypau_app/.env.example` (`DEMO_FOOD_DEVICE_CODE=KPCL0034`, `DEMO_WATER_DEVICE_CODE=KPCL0035`) y replicarlas en `.env.local` local
- [ ] T002 [P] Seguir el protocolo de `Knowledge/19_DevOps/README_DevOps.md` § "Trabajo en 2 PCs" (Principio VIII) y leer `Knowledge/19_DevOps/PENDIENTES_POR_PC.md` antes de tocar código
- [X] T003 [P] Registrar baseline: `grep` de chatbot-gato = 14 archivos (SC-009 arranca en 14 → objetivo 0, en US4); `tsc` + tests de rutas verdes sobre `main`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: hacer `/today` reutilizable **sin cambiar su comportamiento autenticado**. Es un
refactor de un archivo sensible (`today/page.tsx`, ~2840 líneas, revertido 3× por Mauro) que debe
quedar probado sin regresión antes de montar cualquier cosa de demo.

**⚠️ CRITICAL**: ninguna tarea de US1 puede empezar hasta que esta fase esté completa y validada.

- [X] T004 Extraer el shaping de respuesta a `kittypau_app/src/lib/hunger-bar-server.ts`: `buildHungerBarPayload(device, pet)` y `buildConsumoPeriodoPayload(device)`. Sin cambio de lógica. `diasConDatosVentana` se devuelve para el logging (no va en el JSON HTTP)
- [X] T005 `kittypau_app/src/app/api/pets/[id]/hunger-bar/route.ts` y `.../consumo-periodo/route.ts` llaman a los builders; `npx vitest run src/app/api/pets/` verde (8/8); `tsc` limpio. Nota: el log de consumo-periodo pasó de `dias_con_datos` (de un `Map` local) a `diasConDatosVentana` del payload — mismo valor, diagnóstico
- [X] T006 [P] Crear `kittypau_app/src/lib/demo/demo-config.ts`: `getDemoDeviceCodes()` → `DEMO_FOOD_DEVICE_CODE` / `DEMO_WATER_DEVICE_CODE` con defaults `KPCL0034` / `KPCL0035`. Sin `import "server-only"` (no está instalado — rompía vitest); server-only de hecho por leer env sin prefijo `NEXT_PUBLIC_`
- [X] T007 [P] Crear `kittypau_app/src/lib/demo-identity.ts`: `DemoIdentity` / `DemoPetType`, `DEMO_AVATAR_BY_TYPE` (`dog` → `/illustrations/nervous-not.gif`, `cat` → `/illustrations/giphy.gif`), `readDemoIdentity()` / `writeDemoIdentity()` / `clearDemoIdentity()` / `ensureVisitorId()` sobre `kittypau_demo_*` con try/catch por acceso, y limpieza de `kittypau_demo_show_rpg` / `_kind` / `_device_id`
- [X] T008 `kittypau_app/src/lib/demo/demo-fetch.ts` — `createDemoFetch(identity)` precarga `GET /api/demo/today` una vez y rutea `/api/pets` `/api/devices` `/api/profiles` `/api/readings` `/api/pets/:id/hunger-bar` `/api/pets/:id/consumo-periodo` `/api/account/type` `/api/devices/:id/events` a la porción del bundle (mismo shape que el autenticado). Cae a `EMPTY_BUNDLE` si el fetch falla (FR-008)
- [X] T009 Cuerpo de `page.tsx` movido a `today/_components/today-screen.tsx` como `TodayScreen({ mode="authed", fetchImpl, identity=null })`. `doFetch = useMemo(() => fetchImpl ?? authFetch, [fetchImpl])` reemplaza `authFetch` en los 5 call sites internos. `page.tsx` = wrapper (6 líneas). **`git diff` confirmado seam-only**: props + `isDemo`/`doFetch` + 5 swaps + deps `[doFetch]` + gates `isDemo` + overrides de identidad. Sin otros cambios → `mode="authed"` byte-idéntico
- [~] T010 Regresión (SC-006 / FR-013): **automático OK** — `git diff today/page.tsx` = wrapper de 6 líneas; diff de la extracción **verificado seam-only** (props + `isDemo`/`doFetch` + 5 swaps + deps + gates + overrides, nada más); `tsc` limpio; `vitest run` 73/73; `next build` exit 0. **Falta manual**: abrir `/today` como tester y confirmar visualmente que se ve idéntico (quickstart §6)

**Checkpoint**: `/today` autenticado sin cambios de comportamiento (defaults preservan el path actual). Falta la pasada visual manual.

---

## Phase 3: User Story 1 - Ver el producto real con el nombre de mi mascota (Priority: P1) 🎯 MVP

**Goal**: un visitante sin cuenta entra desde el login, escribe dueño + mascota + tipo, y ve la
pantalla `/today` de Bandida con datos reales en vivo (KPCL0034 + KPCL0035) pero con su identidad
encima; nunca aparece "Bandida", el dueño real, ni la foto real.

**Independent Test**: entrar a la demo sin cuenta, completar 2 campos, y comprobar (a) 100% de match
de valores/gráficos contra la app autenticada de Bandida en el mismo minuto, y (b) 0 apariciones de
la identidad real de Bandida.

### Test de contrato para US1 (pedido explícito)

> Escribir primero; debe fallar (no existe la ruta todavía).

- [X] T011 [P] [US1] `kittypau_app/src/app/api/demo/today/route.test.ts` (vitest, 5/5): shape del bundle; `devices` = solo KPCL0034/KPCL0035 sin `owner_id`, `id`=code, `pet_id`="demo-pet"; `JSON.stringify(body)` sin uuid interno / pet_id real / user_id / "bandida" / `diasConDatosVentana`; `429` con `Retry-After`; sin device de comida → 200 `hungerBar.status="sin_dispositivo"`

### Implementación US1

- [X] T012 [US1] `kittypau_app/src/app/api/demo/today/route.ts` (`GET`): `checkRateLimit(...:demo-today, 30, 5min)`; `getDemoDeviceCodes()` → `devices` por `device_id in (food, water)`; `pet_id` del device de comida → fila `pets` solo para `food_normal_min_g/max_g` (**no** en la respuesta); `hungerBar`=`buildHungerBarPayload`, `consumoPeriodo`=`buildConsumoPeriodoPayload` (sin `diasConDatosVentana`), `devices` stripped (`id`=code, `pet_id`="demo-pet", sin `owner_id`), `readings` (3 días/2000 por device, `device_id` remapeado al código), `auditEvents` keyed por código; `degraded()` 200 neutro ante cualquier error (FR-008); `Cache-Control: public, s-maxage=30, swr=120`
- [X] T013 [P] [US1] `kittypau_app/src/lib/demo/demo-fetch.ts` — ver T008 (cumple el rol de "data source": un adaptador `fetchImpl` en vez de un objeto `TodayDataSource`, más quirúrgico para el seam de `TodayScreen`)
- [X] T014 [US1] `today-screen.tsx` modo `demo`: efecto de account-type cortocircuitado (`isAuthed=true`, `accountType="client"`, sin `router.replace("/admin")`); `<QaTestMealNotification>` oculto; bloque de onboarding `accountType==="client"` oculto; `<OnboardingGuideModal>` no se activa (guard `isDemo` en su efecto); `usePushTokenRegistration(!isDemo && ...)`; `useHungerBarPushAlert`/`useHungerBarEventNotifications` reciben `undefined` en demo (y son no-op en web igual). `useMqttLive` toma el código del device de comida del bundle sintético (sin cambio de código — sale de `mqttDeviceId`). **Nota**: el `<Link href="/pet">` del hero y las flechas del selector de mascota quedan visibles pero inertes en demo (1 mascota) — pulir en T017/polish
- [X] T015 [US1] `today-screen.tsx` overrides de identidad en demo: `ownerLabel`, `petLabel`, `petTypeLabel` y `<Image>` del hero usan `identity` del visitante; `petMeta` solo muestra "Tipo" (el pet sintético de `demo-fetch` trae `origin/size/age/weight` = null); nunca se lee `primaryPet.photo_url` en demo → `identity.avatarSrc` (SC-003)
- [X] T016 [US1] `kittypau_app/src/app/(public)/demo/page.tsx` reescrito: `readDemoIdentity()` al montar; sin dueño/mascota → form "Personaliza tu demo" (Perro/Gato con `dog` default, dueño, mascota, "Cancelar" → `clearDemoIdentity()`+`/login`, "Entrar a prueba" → `writeDemoIdentity()`); con identidad → `<TodayScreen mode="demo" fetchImpl={createDemoFetch(identity)} identity={identity} />` + CTA "Crear cuenta" fijo abajo; sin `AppNav`/`AppDataProvider`; ignora `?menu=`. Chatbot-gato ya no se importa acá. **+ pop-up de intro** (pedido de Mauro): modal "Datos 100% reales / gato real funcionando desde abril de 2026", 1× por sesión de navegador (`sessionStorage kittypau_demo_intro_seen`). **Nota**: el POST del lead a `/api/demo/ingreso` es US3/T029 — no entra en este tramo
- [X] T017 [US1] Form: "Entrar a prueba" `disabled` hasta dueño y mascota con `trim().length > 0`; mensaje de qué falta; `maxLength={120}` en inputs; visitante directo a `/demo` ve el form. **Parcial**: truncado visual de nombres muy largos en el hero de `TodayScreen` no forzado en todos los puntos — aceptable MVP, revisar en polish
- [X] T018 [US1] Degradado: `route.ts` `degraded()` 200 neutro; `demo-fetch` cae a `EMPTY_BUNDLE` si el fetch falla → `TodayScreen` pinta los mismos estados vacíos que `/today`; identidad del visitante + CTA "Crear cuenta" viven fuera de `TodayScreen` → siempre visibles
- [~] T019 [US1] Validación manual **pendiente de navegador**: quickstart §1 (entrada < 30 s), §2 (100% match vs `/today` autenticado mismo minuto), §3 (0 identidad real + Network sin campos prohibidos + `429`), §9 (degradado). No ejecutable desde acá

**Checkpoint**: la demo funciona end-to-end como MVP y es independientemente testeable.

---

## Phase 4: User Story 2 - Pasar de la demo a crear la cuenta (Priority: P2)

**Goal**: desde la demo hay un CTA claro a "Crear cuenta" que lleva al registro con dueño / mascota
/ tipo ya cargados; la identidad no se pierde al recargar o volver.

**Independent Test**: en la demo, usar el CTA y verificar que el registro conoce esos valores sin
re-pedirlos; cerrar y volver a la demo en el mismo navegador y confirmar que no re-pide todo.

- [ ] T020 [US2] Agregar el CTA "Crear cuenta" visible en la vista de demo (en `kittypau_app/src/app/(public)/demo/page.tsx`, junto a `<TodayScreen mode="demo">`), sin alterar el layout espejado
- [ ] T021 [US2] Cablear el CTA al flujo de registro de `kittypau_app/src/app/(public)/login/page.tsx` llevando `petName` / `ownerName` / `petType` desde `DemoIdentity` — reutilizar el mecanismo de "resume/prefill" existente (`setRegisterPetName` / `setRegisterUserName` / `registerStep="registro"`, ver `login/page.tsx:790-980`); este CTA es **el único lugar** donde se pide el email (FR-009)
- [ ] T022 [US2] Confirmar persistencia (FR-010): `demo/page.tsx` re-lee `readDemoIdentity()` al montar y saltea el form si hay identidad; sin pérdida a mitad de flujo (si no hay nada recordado, se vuelve a pedir explícitamente)
- [ ] T023 [US2] Validación manual: quickstart §4 paso 4 + escenarios de aceptación de US2

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Registro del lead para seguimiento (Priority: P3)

**Goal**: cada uso de la demo produce un lead en `/admin/demo-ingresos` con dueño + tipo de mascota,
email vacío hasta el CTA; sin duplicados para el mismo visitante.

**Independent Test**: usar la demo con datos nuevos sin email → aparece una fila con dueño + tipo,
email vacío; volver desde el mismo navegador → no se duplica.

- [ ] T024 [US3] **CHECKPOINT Principio III**: obtener OK explícito de Mauro para cambiar el schema de `demo_ingresos`. Si lo niega → activar fallback (omitir T025–T027, mantener `400 MISSING_EMAIL`, anotar en `PENDIENTES_POR_PC.md`) y hacer solo T028 parcial (panel tolera email vacío para leads que sí lo tengan)
- [ ] T025 [US3] Escribir `supabase/migrations/2026XXXXXXXXXX_demo_ingresos_sin_email.sql` (data-model §3): `email` `drop not null`; `add column visitor_id text`; `add column pet_type text`; `create unique index demo_ingresos_visitor_uniq on public.demo_ingresos (visitor_id) where email is null`; reemplazar el check de formato por `check (email is null or position('@' in email) > 1)`; `create function public.record_demo_ingreso_v2(p_visitor_id text, p_email text, p_owner_name text, p_pet_name text, p_pet_type text, p_source text) returns public.demo_ingresos` con `set search_path = public, pg_temp` y la lógica de upsert por email / por `visitor_id where email is null`
- [ ] T026 [US3] Aplicar la migración a Supabase (solo tras T024 OK): `supabase db push` o SQL en el dashboard; verificar columnas `visitor_id` / `pet_type`, el índice parcial y la función `record_demo_ingreso_v2`
- [ ] T027 [US3] Modificar `kittypau_app/src/app/api/demo/ingreso/route.ts` ([contracts/demo-ingreso-api.md](./contracts/demo-ingreso-api.md)): aceptar body sin `email`; exigir `visitor_id` (`400 MISSING_VISITOR_ID` en vez de `MISSING_EMAIL`); parsear y pasar `pet_type`; llamar `record_demo_ingreso_v2`; `audit_events` sin cambios; rate-limit `:demo-ingreso` sin cambios
- [ ] T028 [US3] Actualizar `kittypau_app/src/app/(app)/admin/demo-ingresos/page.tsx` (y `kittypau_app/src/app/api/admin/demo-ingresos/route.ts` si hace falta el select): mostrar columnas `owner_name` y `pet_type`; tolerar `email` vacío/`null` usando `pet_name` / `owner_name` como etiqueta
- [ ] T029 [US3] En `kittypau_app/src/app/(public)/demo/page.tsx` (submit del form) y `kittypau_app/src/app/(public)/login/page.tsx` (`recordDemoIngreso` / `startTrial`): mandar `visitor_id` (de `ensureVisitorId()`) y `pet_type` en el beacon; `email` opcional. Cambio quirúrgico — solo el payload del beacon
- [ ] T030 [US3] Validación manual: quickstart §4 (lead con y sin email, dedupe por `visitor_id`, sin duplicados al reingresar, SC-007)

**Checkpoint**: US1, US2 y US3 funcionan de forma independiente.

---

## Phase 6: User Story 4 - Sacar el chatbot-gato del proyecto (Priority: P3)

**Goal**: 0 referencias a chatbot-gato en el repo; `/login` funciona igual sin el gato animado;
`/client-demo` y `/test` consistentes con la demo nueva.

**Independent Test**: `grep` de los 7 términos → 0 resultados; `tsc`/`eslint`/`build` limpios;
login (login, registro, botón Demo App) funciona.

- [ ] T031 [US4] Edición quirúrgica de `kittypau_app/src/app/(public)/login/page.tsx`: quitar imports `@/chatbot-gato/client` / `/login-context` / `/runtime` (~39-41), la llamada `buildChatbotRuntime({ page: "login" })` (~247) + estado/refs asociados, la llamada `fetchChatbotGatoResponse(...)` (~305) + el bloque del easter-egg del gato tipeado, reemplazar `LOGIN_CHATBOT_CONTEXT.modal.primaryCta` (~2347) por copy literal, y quitar `window.localStorage.setItem("kittypau_demo_show_rpg", "1")` (~1431). Nada más del login se toca
- [ ] T032 [US4] Borrar la carpeta `kittypau_app/src/chatbot-gato/` (13 archivos) y `kittypau_app/src/app/api/chatbot-gato/route.ts`
- [ ] T033 [US4] Quitar de `kittypau_app/src/app/globals.css` los bloques `.trial-rpg-*`, `@keyframes trial-rpg-*` y `.login-trial-dialog-scene .trial-rpg-*`; **conservar** `.login-trial-overlay` / `.login-trial-modal` / `.login-trial-input` / `.login-trial-submit` / `.login-trial-cancel` (modal "Personaliza tu demo")
- [ ] T034 [P] [US4] Convertir `kittypau_app/src/app/(public)/client-demo/page.tsx` y `kittypau_app/src/app/(public)/test/page.tsx` en redirects permanentes a `/demo` (`redirect("/demo")` server-side), sin identidad hardcodeada ni `?menu=` (FR-019)
- [ ] T035 [US4] Verificar SC-009: `grep -rn "chatbot-gato\|TrialRpg\|trial-rpg\|fetchChatbotGatoResponse\|DEMO_SCREEN_CONTEXT\|LOGIN_CHATBOT_CONTEXT\|buildChatbotRuntime" kittypau_app/src` → 0; `npx tsc --noEmit` + `npx eslint src` + `npm run build` limpios; quickstart §7 (login funciona sin el gato) y §8 (alias redirigen)

**Checkpoint**: repo sin chatbot-gato; las 4 historias funcionan.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T036 [P] Actualizar `Knowledge/04_Frontend/ESTRUCTURA_src_app.md`: la `/demo` cambió de concepto (datos de ejemplo → espejo en vivo de `/today`, una sola vista); se fue el chatbot-gato; nuevo `GET /api/demo/today`; seam `<TodayScreen>` + deuda documentada
- [ ] T037 [P] Actualizar `Knowledge/19_DevOps/PENDIENTES_POR_PC.md`: mover lo hecho a "Completado"; registrar el estado del checkpoint de la migración `demo_ingresos` (aplicada / pendiente con fallback)
- [ ] T038 [P] Agregar comentarios `ponytail:` marcando la deuda explícita: shape del bundle en `kittypau_app/src/app/api/demo/today/route.ts` y `loadReadings` no-op en `kittypau_app/src/lib/demo/demo-data-source.ts` (FR-016)
- [ ] T039 Gate completo en `kittypau_app/`: `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, `npm run build` — todo limpio
- [ ] T040 Ejecutar quickstart.md §1–§9 end-to-end + "Checklist de release"; seguir el protocolo de 2 PCs de `Knowledge/19_DevOps/README_DevOps.md` antes de `git push`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. **BLOQUEA US1/US2** (ambas renderizan `<TodayScreen>`).
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2 (Phase 4)**: depende de Foundational; el CTA se monta junto a la vista de US1 (T020 sobre `demo/page.tsx` que crea T016) → en la práctica va después de US1.
- **US3 (Phase 5)**: depende de Foundational + `demo-identity.ts` (T007) para `visitor_id`. Independiente de US1/US2 salvo T029 (toca el submit del form creado en T016) → hacer US3 después de T016 o coordinar el archivo.
- **US4 (Phase 6)**: **totalmente independiente** — no depende de Foundational ni de las otras historias. Puede ir primera. Único cruce de archivo: T016 (US1) reescribe `demo/page.tsx` y de paso borra sus imports de chatbot; si US4 va antes, T016 parte de un archivo ya sin chatbot. Sin conflicto real.
- **Polish (Phase 7)**: depende de las historias que se quieran cerrar.

### User Story Dependencies

- **US1 (P1)**: solo Foundational.
- **US2 (P2)**: Foundational; integra con la página de US1 pero es testeable aparte.
- **US3 (P3)**: Foundational (`demo-identity`); el checkpoint T024 puede bloquear T025–T027 (fallback disponible).
- **US4 (P3)**: ninguna.

### Within Each Story

- US1: T011 (test, falla) → T012 (endpoint) → T013 (dataSource) → T014/T015 (today-screen demo mode) → T016/T017/T018 (página + edge + degradado) → T019 (validación).
- Modelos/infra antes que consumidores; validación al final de cada fase.

### Parallel Opportunities

- Setup: T002, T003 en paralelo.
- Foundational: T006 y T007 en paralelo entre sí y con T004; T008 tras entender `page.tsx`; T009 tras T004+T008; T005 tras T004; T010 al final.
- US1: T011 y T013 marcados [P] (archivos distintos); T014 y T015 tocan el mismo archivo (`today-screen.tsx`) → **secuenciales**.
- US4: T034 [P] con el resto; T031/T032/T033 tocan archivos distintos pero `tsc` los encadena (borrar carpeta tras desconectar `/login`) → orden T031 → T032 → T033.
- Historias en paralelo con varios devs: US4 desde el día 1; US1 tras Foundational; US2/US3 tras T016.

---

## Parallel Example: US1

```bash
# Tras Foundational, arrancar en paralelo:
Task T011: "Contract test en kittypau_app/src/app/api/demo/today/route.test.ts"
Task T013: "demoDataSource en kittypau_app/src/lib/demo/demo-data-source.ts"
# (T012 el endpoint puede ir en paralelo también; T011 lo valida cuando exista)
```

---

## Implementation Strategy

### MVP primero (solo US1)

1. Phase 1: Setup.
2. Phase 2: Foundational — **crítico**, y validar T010 (regresión `/today`) antes de seguir.
3. Phase 3: US1.
4. **PARAR y VALIDAR**: quickstart §1–§3, §6, §9. Si OK → deploy (JS puro, `git push` a `main`, sin APK).

### Entrega incremental

1. Setup + Foundational → base lista (`/today` intacto, `<TodayScreen>` reusable).
2. US4 (independiente, sin riesgo) → repo limpio, login sin gato.
3. US1 → demo en vivo funcionando (MVP) → deploy/demo.
4. US2 → CTA a registro → deploy.
5. US3 → lead sin email (con checkpoint de Mauro para el schema) → deploy.
6. Polish → docs de Knowledge, gate completo, quickstart end-to-end.

### Notas

- `[P]` = archivos distintos, sin dependencia pendiente.
- Commit por tarea o grupo lógico; mensaje sin backticks (gotcha de git-bash).
- T024 (schema Supabase) NO se aplica sin OK explícito de Mauro (Principio III).
- Foundational toca `today/page.tsx` (sensible, Barras Sims protegido) — revisar el diff de la
  extracción con lupa; el camino `mode === "authed"` debe quedar idéntico al actual.
