# Phase 0 — Research: Demo /today en vivo

Todas las decisiones se tomaron leyendo el código real (no asumido). Referencias de archivo con
línea al 2026-09-10.

---

## D1 — ¿Cómo lee la demo (sin sesión) los datos en vivo de la mascota de demo?

**Decisión**: Endpoint nuevo **`GET /api/demo/today`** — bundle único, público, **solo lectura**,
`supabaseServer` (service_role) del lado servidor, rate-limitado con `checkRateLimit` /
`getRateKeyFromRequest` (infra ya existente en `src/app/api/_rate-limit.ts`), **hard-scoped** a los
device ids de demo resueltos de variables de entorno server-side. La lógica de cómputo y el shaping
de la respuesta se **comparten** con las rutas autenticadas: se extrae de
`src/app/api/pets/[id]/hunger-bar/route.ts` y `…/consumo-periodo/route.ts` el armado del payload a
funciones en `src/lib/hunger-bar-server.ts` (`buildHungerBarPayload`, `buildConsumoPeriodoPayload`),
y ambas rutas (autenticada y demo) las llaman. El bundle devuelve, en un shape estable documentado
([contracts/demo-today-api.md](./contracts/demo-today-api.md)):

```
{ devices[], readings[], auditEvents{}, hungerBar{…mismo shape que /api/pets/:id/hunger-bar},
  consumoPeriodo{…mismo shape que /api/pets/:id/consumo-periodo} }
```

**Rationale**:
- **No toca el auth gate de endpoints de producción.** Las rutas autenticadas (`hunger-bar`,
  `consumo-periodo`, `/api/readings`, `/api/pets`, `/api/devices`, `/api/profiles`) siguen exigiendo
  `getUserClient` + ownership sin cambios. Modificar ese gate para un "modo demo" (opción b) es
  riesgoso en un boundary de seguridad y deja la puerta de un bypass en código caliente.
- **Drift mínimo (FR-016 / SC-008).** El cálculo pesado ya vive en `hunger-bar-server.ts`
  (`resolveFoodDevice` + `fetchHungerBarForDevice` → `computeHungerBar`), reusado hoy por el cron de
  push. Lo único que hoy está en las rutas es ~15 líneas de shaping (`computeConsumoKpis` sobre
  `result.events`; el group-by `semana`/`mes`). Al mover ese shaping a `hunger-bar-server.ts`, el
  endpoint demo y el autenticado producen **exactamente el mismo JSON** desde la misma función. El
  único seam nuevo es el *sobre* (el bundle que agrupa las 2 respuestas + readings + devices +
  auditEvents) y el adaptador `dataSource` del front — ambos documentados como deuda explícita.
- **Concurrencia / abuso (FR-012 / Edge Case "muchos visitantes").** `Cache-Control:
  public, s-maxage=30, stale-while-revalidate=120` en Vercel sirve la mayoría de las visitas desde
  el edge sin recomputar. `checkRateLimit` por IP (`getRateKeyFromRequest`) corta el flood. El
  endpoint **solo** conoce los ids de demo → imposible pedir otro device.
- **MQTT en vivo funciona sin cambios.** `useMqttLive` (`src/lib/hooks/useMqttLive.ts`) usa
  `NEXT_PUBLIC_MQTT_*_READONLY` desde el browser, no requiere sesión. La demo le pasa el código
  KPCL del device de comida de demo y obtiene lecturas en vivo igual que `/today`.

**Alternativas consideradas**:
- **(b) "Modo demo" en los endpoints existentes** (saltar `getUserClient`/ownership si
  `petId === DEMO_PET_ID`): diff más chico en apariencia, pero mete una rama de bypass de auth en 3-6
  rutas de producción, multiplica los puntos donde revisar FR-012, y sigue necesitando el sobre
  bundle o 6 fetches públicos separados. Rechazada por superficie de seguridad.
- **(c) SSR / server component que arma el payload**: `/today` es un client component con polling
  cada 5 min, `useMqttLive`, y selección de device/pet en `localStorage`. Un server component que
  "arma el payload" obliga a un segundo camino de render y de hidratación → es exactamente el fork
  que FR-016 prohíbe. Rechazada.
- **Endpoints espejo `/api/demo/{pets,devices,readings,hunger-bar,consumo-periodo}`** (1:1 con los
  autenticados): máxima fidelidad de shape pero 5 archivos nuevos y 5 rate-limits que afinar. El
  bundle único hace 1 request en vez de 6 (mejor para la demo) y 1 archivo. La fidelidad se preserva
  igual porque los sub-shapes salen de las mismas funciones compartidas. Preferido el bundle.

**Config del dispositivo de demo** (Edge Case "Bandida deja de estar vinculada"):
`src/lib/demo/demo-config.ts` (server-only) resuelve de env:
`DEMO_FOOD_DEVICE_CODE` (default `"KPCL0034"`), `DEMO_WATER_DEVICE_CODE` (default `"KPCL0035"`).
El endpoint traduce código → `devices.id` con `supabaseServer` al vuelo. Reconfigurar = cambiar la
env var en Vercel, sin tocar código. Se agrega a `.env.example`.

---

## D2 — ¿Cómo se renderiza el mismo árbol de `/today` con identidad y datos de demo, sin forkear?

**Decisión**: **Extraer el cuerpo de `today/page.tsx` a `src/app/(app)/today/_components/today-screen.tsx`**
como `<TodayScreen>`. `page.tsx` queda como:

```tsx
import TodayScreen from "./_components/today-screen";
export default function TodayPage() { return <TodayScreen />; }
```

`<TodayScreen>` recibe 3 props **opcionales** con default que preserva el comportamiento actual:

| Prop | Default | En `mode="demo"` |
|---|---|---|
| `mode: "authed" \| "demo"` | `"authed"` | `"demo"` |
| `dataSource: TodayDataSource` | `authedDataSource` (las llamadas `authFetch` de hoy, extraídas a `src/lib/today/today-data-source.ts` sin cambio de lógica) | `demoDataSource` (`src/lib/demo/demo-data-source.ts`) — 1 fetch a `/api/demo/today`, sirve slices; `loadReadings` con cursor = no-op |
| `identity: { petName, ownerName, petType, avatarSrc } \| null` | `null` → usa `state.profile` / `primaryPet` como hoy | objeto del visitante (de `localStorage` vía `src/lib/demo-identity.ts`) |

Puntos del componente que se condicionan por `mode === "demo"` (todos son "apagar", no "reescribir"):

- **Efecto de auth** (`getValidAccessToken` → `/api/account/type` → `setAccountType` →
  `router.replace("/admin")`, `today/page.tsx:671-706`): se salta; en demo `accountType` queda
  `"client"` fijo y `isAuthed` = `false`.
- **Efecto de carga** (`today/page.tsx:735-856`, `authFetch("/api/pets"|"/api/devices"|"/api/profiles")`
  + `loadReadings`): reemplazado por `dataSource.loadBootstrap()`.
- **Fetch hunger-bar** (`:1054`) y **consumo-periodo** (`:1084`): `dataSource.loadHungerBar()` /
  `dataSource.loadConsumoPeriodo()`. La cadencia (poll 5 min / 1 vez al montar) se mantiene → FR-007.
- **Identidad**: `ownerLabel`, `petLabel`, `petTypeLabel`, `petMeta`, y el `<Image src={primaryPet?.photo_url || "/pet_profile.jpeg"}>` (`:2574`) leen de `props.identity` cuando está. La foto real de Bandida nunca se pide en demo (no viene en el bundle) → SC-003.
- **UI solo-sesión que se oculta en demo (FR-014)**: botón "Cerrar sesión" (`signOutSession`,
  `:2803`), `<QaTestMealNotification>` (`:2837`), `<DiagnosticoRapidoCard>` (`:2753/2762`, ya está
  detrás de `accountType === "client"` + selección manual), `<OnboardingGuideModal>` (`:2830`, ya
  detrás de `isAuthed`), el selector de mascota (la demo tiene 1).
- **Hooks de push/notificación**: `usePushTokenRegistration(isAuthed === true)` ya queda en `false`.
  `useHungerBarPushAlert` / `useHungerBarEventNotifications` reciben `petName` de `props.identity`;
  en demo no hay permiso de notificación → son no-ops de hecho, pero se pasan `enabled: mode === "authed"`
  para no depender de eso (fuera de alcance: notificaciones en la demo, Assumptions del spec).
- **Estados vacíos / degradado (FR-008 / SC-004)**: el componente ya maneja
  `status: "sin_dispositivo"` / `sin registro` / gris. `demoDataSource` ante fallo de
  `/api/demo/today` devuelve el mismo shape neutro (`hungerBar: { status: "sin_dispositivo", … }`) →
  la demo cae en los mismos estados vacíos que `/today`, nunca pantalla rota.

**Rationale**: Es la única forma de cumplir FR-016 literal ("la misma vista de `/today` de la app —
el mismo código y los mismos componentes"). El gráfico día/noche (armado inline sobre `readings` +
`deviceAuditEvents`, ~15 vars de estado) **se reusa gratis** porque se reusa el componente entero —
si extrajéramos solo las cards habría que extraer o duplicar el chart. `today/page.tsx` no es
importado por nadie más (grep), así que la extracción es un cut-paste mecánico + wrapper. El riesgo
de regresión en `/today` real (SC-006) se acota porque el camino `mode === "authed"` es el código
actual con los `authFetch` movidos 1:1 a `authedDataSource`; se valida por checklist visual en
[quickstart.md](./quickstart.md).

**Alternativas consideradas**: ver Complexity Tracking en [plan.md](./plan.md) (importar el módulo
de ruta; copiar la vista; extraer solo sub-vistas). Todas peores para drift o acoplamiento.

**Deuda explícita registrada** (FR-016 lo exige): (1) el shape del bundle `/api/demo/today`; (2) el
adaptador `demoDataSource` (en particular `loadReadings` con cursor = no-op → en la demo no hay
"cargar más" histórico, aceptable para una sola vista de vistazo). Ambas se anotan con comentario
`ponytail:` en el código y en `ESTRUCTURA_src_app.md`.

---

## D3 — Alcance y orden del borrado del chatbot-gato (FR-018 / SC-009)

**Decisión**: Borrado en este orden (para que `tsc` guíe cada paso):

1. **`/login`** (`src/app/(public)/login/page.tsx`) — cambio quirúrgico:
   - quitar imports `src/chatbot-gato/client` (`:39`), `…/login-context` (`:40`), `…/runtime` (`:41`).
   - quitar `buildChatbotRuntime({ page: "login" })` (`:247`) y su estado/refs asociados.
   - quitar la llamada `fetchChatbotGatoResponse(…)` (`:305`) y el easter-egg del gato tipeado que
     la rodea (bloque documentado en el header del archivo, `:10` y `:18`).
   - quitar el uso de `LOGIN_CHATBOT_CONTEXT` (`:2347`, `modal.primaryCta`) → sustituir por copy
     literal (el modal "Personaliza tu demo" se conserva; solo pierde el texto que venía del context
     del chatbot).
   - quitar `window.localStorage.setItem("kittypau_demo_show_rpg", "1")` (`:1431`) — la RPG ya no
     existe. **No** tocar el resto de `startTrial` / `recordDemoIngreso` / los `kittypau_demo_*`.
2. **`/demo` viejo** (`src/app/(public)/demo/page.tsx`, 557 líneas) — se borra entero y se reescribe
   (ver D-frontend abajo). Elimina de paso los imports `TrialRpgDialog*`, `DEMO_SCREEN_CONTEXT`,
   `fetchChatbotGatoResponse` (`:16-23`).
3. **Carpeta** `src/chatbot-gato/` completa (13 archivos: `client.ts`, `demo-block-prompts.ts`,
   `demo-context.ts`, `dialog-profile.ts`, `hf.ts`, `inicio-block-prompts.ts`, `inicio-context.ts`,
   `login-context.ts`, `personality-canon.ts`, `product-context.ts`, `runtime.ts`,
   `trial-rpg-dialog-dock.tsx`, `trial-rpg-dialog.tsx`).
4. **Endpoint** `src/app/api/chatbot-gato/route.ts`.
5. **`globals.css`** — bloques `.login-trial-dialog-scene .trial-rpg-*` (`:2929-2937`),
   `.trial-rpg-modal` y `@keyframes trial-rpg-*` (desde `:3102`), y cualquier `.trial-rpg-*`
   restante. **Conservar** `.login-trial-*` que NO son del RPG (`.login-trial-overlay`,
   `.login-trial-modal`, `.login-trial-input`, `.login-trial-submit`, etc. — son del modal
   "Personaliza tu demo" que se queda). Distinguir por prefijo exacto `trial-rpg`.
6. **Verificación (SC-009)**: `grep -rn "chatbot-gato\|TrialRpg\|trial-rpg\|fetchChatbotGatoResponse\|DEMO_SCREEN_CONTEXT\|LOGIN_CHATBOT_CONTEXT\|buildChatbotRuntime" kittypau_app/src` → 0 resultados. `tsc` + `eslint` + `next build` limpios. Login funciona (login, registro, botón demo) — checklist en quickstart.

**Rationale**: Mauro: "es del pasado, en teoría debería estar borrado". El orden
`/login` → `/demo` → carpeta → endpoint → CSS hace que el compilador señale cada consumidor que
falte. `/login` es grande y sensible (Principio I) → el diff se acota a sacar el chatbot.

**Alternativa considerada**: dejar la carpeta y solo desconectar los consumidores. Rechazada: SC-009
exige 0 referencias y ~430 líneas de código muerto + un endpoint sin uso es exactamente lo que la
constitución dice eliminar (Principio I, "eliminación sobre adición").

---

## D4 — Lead sin email (FR-011) e impacto de schema

**Estado actual** (leído):
- `demo_ingresos` (`supabase/migrations/20260310120000_demo_ingresos_leads.sql`): `email text not
  null`, `unique(email)`, `check (position('@' in email) > 1)`. Columnas `owner_name`, `pet_name`,
  `source`, contadores. **No hay `pet_type`.** Dedupe key = email.
- RPC `record_demo_ingreso(p_email, p_owner_name, p_pet_name, p_source)` → `raise exception` si
  email vacío. Upsert `on conflict (email)`.
- `POST /api/demo/ingreso`: si `!email` → `400 MISSING_EMAIL`. `pet_type` solo se guarda en
  `audit_events.payload`, no en `demo_ingresos`.
- `/login` `startTrial` ya permite email vacío del lado cliente y manda el beacon igual → hoy ese
  lead **se pierde** en el 400. FR-011 arregla justo esto.

**Decisión**:
- **Migración nueva** `supabase/migrations/2026XXXX_demo_ingresos_sin_email.sql`:
  - `alter table demo_ingresos alter column email drop not null;`
  - `alter table demo_ingresos add column visitor_id text;`
  - `alter table demo_ingresos add column pet_type text;`
  - reemplazar el `unique(email)` por un esquema de dedupe que admita email null:
    `unique(email)` se mantiene para leads con email (Postgres permite múltiples NULL en UNIQUE);
    índice único parcial nuevo `unique(visitor_id) where email is null` para dedupe de leads
    anónimos. El check de formato de email pasa a `check (email is null or position('@' in email) > 1)`.
  - RPC nuevo `record_demo_ingreso_v2(p_visitor_id, p_email, p_owner_name, p_pet_name, p_pet_type,
    p_source)`: si hay email → upsert `on conflict (email)` (comportamiento actual + `pet_type`); si
    no hay email → upsert `on conflict (visitor_id) where email is null`. Mantener
    `record_demo_ingreso` viejo para no romper nada más que lo llame (grep: solo `/api/demo/ingreso`).
    `set search_path = public, pg_temp` como el fix de `20260311123000`.
- **`POST /api/demo/ingreso`**: aceptar body sin `email`; exigir `visitor_id` (uuid corto generado
  en el cliente y guardado en `localStorage` como `kittypau_demo_visitor_id`); llamar
  `record_demo_ingreso_v2`. Mantener `audit_events` como está. Rate-limit igual (ya existe,
  `:demo-ingreso`, 5/10min).
- **`/admin/demo-ingresos`** (panel): mostrar `owner_name` + `pet_type` (nuevos) y tolerar
  `email` vacío (hoy asume email presente como key visible). Cambio de solo lectura en el panel.

**Rationale**: FR-011 pide leads sin email dedupeados por visitante + `pet_type`. La causa raíz está
en el schema (email como key obligatoria), no en el caller → se arregla ahí (Principio II). El
`visitor_id` ya encaja con el patrón `kittypau_demo_*` de `localStorage` que la feature usa para la
identidad.

**Checkpoint Principio III**: la migración se **escribe** en este plan pero **no se aplica**
(`supabase db push` / SQL en el dashboard) hasta OK explícito de Mauro. `/speckit-tasks` debe marcar
esa tarea como bloqueante con confirmación humana. Si Mauro no quiere tocar schema ahora: fallback
documentado = seguir descartando el lead sin email (comportamiento actual) y capturarlo solo cuando
el visitante deje el email en el CTA "Crear cuenta" (FR-009). La feature US1/US2 no depende de esto
(US3 es P3).

---

## D5 — `/client-demo` y `/test` (FR-019)

**Estado actual** (leído): ambos son client components que setean `kittypau_demo_*` en
`localStorage` con identidades hardcodeadas ("Cliente Demo"/"Michi Cliente", "Test Mode"/"Mishi
Demo"), setean `kittypau_demo_show_rpg`, y hacen `router.replace("/demo?menu=today")`.

**Decisión**: reemplazar el cuerpo de ambos por un redirect permanente a `/demo` (sin
`?menu=`, que ya no existe — FR-015). Implementación: `redirect("/demo")` de
`next/navigation` en un server component, o `next.config` `redirects()` con `permanent: true`.
Preferido el redirect en el archivo (менos config global). No preservan identidad hardcodeada — si
alguien entra por esas URLs, ve el form "Personaliza tu demo" como cualquier visitante.

**Rationale**: FR-019 — "o redirigen a la demo nueva, o se eliminan; no pueden quedar renderizando
una demo que ya no existe". Redirect es menos ruptura que 404 para links viejos. Borrar los
archivos y poner el redirect en `next.config` también es válido; se decide en `/speckit-tasks`.

---

## Resumen de NEEDS CLARIFICATION resueltos

| # | Pregunta | Resolución |
|---|---|---|
| — | Acceso a datos sin sesión | D1: `GET /api/demo/today` bundle, service_role, rate-limited, scoped a devices demo, shaping compartido con rutas autenticadas |
| — | Reuso del árbol de `/today` sin forkear | D2: extraer `<TodayScreen>` con props `mode`/`dataSource`/`identity`; demo apaga UI de sesión |
| — | Alcance/orden borrado chatbot-gato | D3: `/login` → `/demo` → carpeta → endpoint → CSS; grep de verificación |
| — | Lead sin email + schema | D4: migración (email nullable + `visitor_id` + `pet_type` + RPC v2) — **checkpoint Principio III**; fallback si Mauro no aprueba |
| — | `/client-demo` + `/test` | D5: redirect permanente a `/demo` |

Sin `[NEEDS CLARIFICATION]` pendientes. Listo para Phase 1.
