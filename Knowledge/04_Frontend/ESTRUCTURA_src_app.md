---
id: estructura_src_app
title: "Estructura de src/app — función de cada carpeta"
type: frontend
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-09-15
tags:
  - nextjs
  - app-router
  - estructura
  - codigo-muerto
related:
  - [[04_Frontend/README_Frontend]]
  - [[18_UI/README_UI]]
  - [[18_UI/Componentes/README_Componentes]]
  - [[05_API/README_API]]
  - [[AUDITORIA_2026_08_11]]
---

# Estructura de `src/app` — función de cada carpeta

Mapa carpeta-por-carpeta de `kittypau_app/src/app`, con qué página real sirve cada una,
tamaño (líneas) y notas de estado. Nace de la reorganización del 2026-08-11 (mover
`app-nav.tsx` y `registro-flow.tsx` a su ubicación real, eliminar código muerto).
Este documento es más granular que [[04_Frontend/README_Frontend]] — ese da el stack
completo, este da carpeta por carpeta con relación al total de la app.

Convención Next.js App Router usada en el proyecto:
- `(app)` y `(public)` son **route groups** — el paréntesis no aparece en la URL, solo agrupan.
- `_components/`, `_lib/`, `_data/` con guion bajo son carpetas privadas — Next.js las
  excluye del ruteo, aunque estén dentro de una carpeta de ruta.
- Un archivo importado desde **otro** route group (ej. `AppNav` usado por `(app)` y
  `(public)/demo`) debe vivir en `_components/` top-level, no anidado en el route group
  que lo creó primero — si no, el árbol miente sobre quién lo usa. Ver commit `9128ad0`.

---

## 1. Raíz de `src/app/` — archivos especiales de Next.js

| Archivo | Función |
|---|---|
| `layout.tsx` (99 líneas) | Root layout: fuentes (Inter/Fraunces/Titan One/Geist Mono/Lato), `<RouteLoadingOverlay>`, `<NativeApkMode>`, `<NativeThanksNotification>`, `<ParallaxRoot>`. Envuelve TODA la app, incluidos `(app)` y `(public)`. |
| `page.tsx` (24 líneas) | Ruta `/` — sin UI propia: resuelve sesión (`resolveAuthenticatedPath`) y redirige a `/today` o `/login`. |
| `globals.css` | Estilos globales + clases scoped `.kp-native-apk`/`.kp-flavor-native` para el flavor Android. |
| `error.tsx` | Error boundary de Next.js para errores dentro de una ruta — renderiza `KittypauErrorScreen`. |
| `global-error.tsx` | Error boundary de más alto nivel (reemplaza incluso el root layout si este falla). |
| `not-found.tsx` | 404 de Next.js (cuando no matchea ninguna ruta) — `KittypauErrorScreen type="not_found"`. |
| `loading.tsx` | Loading UI de Next.js (Suspense boundary automático por ruta) — logo + spinner. |
| `manifest.ts` | PWA manifest (`/manifest.webmanifest`) — nombre, iconos, `theme_color`. |
| `favicon.ico` | Ícono del navegador. |

> `(public)/404/page.tsx` y `(public)/error/page.tsx` **duplican** el propósito de
> `not-found.tsx`/`error.tsx` pero como rutas navegables explícitas (`/404`, `/error?type=...`).
> Existen porque la APK Android (Capacitor) necesita una URL real a la que redirigir en
> vez de depender del error boundary de Next — no es duplicación accidental.

---

## 2. `(app)/` — rutas protegidas (requieren sesión)

Layout propio: `(app)/layout.tsx` (13 líneas) — envuelve todo en `<AppDataProvider>`
(estado global: perfil, mascota, KPCL) y renderiza `<AppNav>`.

| Carpeta | Ruta | `page.tsx` | Función |
|---|---|---|---|
| `inicio/` | `/inicio` | 20 líneas | **Solo redirect** a `/today` (`router.replace`). No es un dashboard propio — el nombre es heredado, el dashboard real es `today/`. |
| `today/` | `/today` | 11 líneas (solo wrapper) | Pantalla principal: actividad del día ("ficha de personaje" con foto/racha/comidas/agua), Barras Sims (comida/agua, track "líquido con onda"), wellness de plato, timeline día/noche (+ copia de prueba en vista semanal, ver abajo), hunger bar, modo guía, botón "Agregar widget a tu pantalla de inicio" al final del feed (solo APK nativa). El grueso real vive en `today-screen.tsx` (ver fila siguiente) — `page.tsx` es puro wrapper. |
| `today/_components/` | — | — | **`today-screen.tsx` (3467 líneas, 2026-09-15) — ya es el archivo fuente más grande de toda la app, superó a `admin/page.tsx` (3291)**, tras la redisño "gamificado" de la sesión 2026-09-14 + la vista semanal de prueba + el botón del widget (ambos 2026-09-15). Cuerpo entero de la vista, extraído de `page.tsx`; `<TodayScreen mode="authed"\|"demo">` para reusar la MISMA vista en `/demo` sin forkear (spec 009). Además: `barras-sims-card.tsx` (294), `bowl-wellness-card.tsx` (390), `day-night-timeline-card.tsx` (120, vista diaria — carriles fijos por categoría, no timeline temporal continuo), **`day-night-timeline-card-weekly.tsx` (135, NUEVO 2026-09-15)** — copia de prueba en vista semanal (7 filas lunes-domingo, mismo patrón de "carcasa visual" que el diario, chartData/Options se computan en `today-screen.tsx`; se renderiza justo debajo del original, no lo reemplaza — ver `Knowledge/29_Specs/010-widget-android-hero` para el objetivo del botón de widget que también vive acá), `consumo-kpis-card.tsx` (251), `consumo-periodo-card.tsx` (77), `onboarding-guide-modal.tsx` (62). **`today-screen.tsx` SÍ lo importa `(public)/demo/page.tsx`** (cross-group) — el resto son privados a la ruta. |
| `today/_lib/` | — | — | `today-format.tsx` — helpers puros de formato (labels de batería/conectividad, `renderTrend`, clases de tono) sin estado, movidos fuera de `page.tsx`. |
| `bowl/` | `/bowl` | 1755 líneas | Monitoreo en vivo del comedero vía MQTT directo desde el browser (`useMqttLive`) — peso, estado, sin polling. |
| `pet/` | `/pet` | **2297 líneas** (corregido 2026-09-15; documentado antes como 907 — creció ~2.6x sin registro de por qué, pendiente investigar) | Perfil de la mascota (datos, foto, historial de dispositivo asociado). |
| `story/` | `/story` | 718 líneas | Historial y análisis de sesiones/consumo. |
| `settings/` | `/settings` | 491 líneas | Configuración de cuenta/dispositivo. El botón "Agregar widget" se probó acá primero (2026-09-15) pero Mauro pidió moverlo al final del feed de `/today` — no vive en `settings/` en la versión final, ver fila de `today/_components/`. |
| `dispositivos/` | — | **sin `page.tsx`** | `/dispositivos` (raíz) da 404 real. Solo existe para agrupar el subpath `nuevo/`. |
| `dispositivos/nuevo/` | `/dispositivos/nuevo` | 258 líneas | Alta manual de un KPCL a una mascota existente (código `KPCLxxxx`, tipo comida/agua). |
| `registro/` | `/registro` | 22 líneas | **Solo redirect** a `/login?register=1`. El flujo real de alta de cuenta+mascota+dispositivo (`RegistroFlow`, 4 pasos) vive en `(public)/login/_components/`, no acá — ver nota de reorganización más abajo. |
| `admin/` | `/admin` | 3291 líneas (bajando — extracción por componentes en curso, ver [[29_Specs/SPEC_02_UIUX_Mejoras]] A-C1) | Panel administrador — el `page.tsx` más grande de toda la app (aunque ya no el archivo fuente más grande del repo, ver `today-screen.tsx` arriba). Dashboard con métricas, salud del sistema, dispositivos, mascotas. |
| `admin/_components/` | — | — | `section-status-card.tsx`, `avisos-criticos-card.tsx`, `kpi-ejecutivos-card.tsx`, `modelos-negocio-card.tsx` — batch 1 de la extracción de `admin/page.tsx`, mismo patrón que `today/_components/` (cálculo queda en el page.tsx, el componente solo renderiza). |
| `admin/demo-ingresos/` | `/admin/demo-ingresos` | ~155 líneas | Lista de leads capturados desde `/demo` (email —o "(sin email)"—, titular, mascota, tipo, source, primer/último visto, contador). Dedup por email o, si el visitante entró sin correo, por `visitor_id` (spec 009 US3). |
| `admin/javo/` | `/admin/javo` | 368 líneas | Panel interno de seguimiento de proyectos (bridge/firmware/app/docs) — no es data de mascotas, es tracking de trabajo técnico ("Javo" = apodo del proyecto). |

> ⚠️ `admin/alerts`, `admin/analytics`, `admin/devices`, `admin/legacy`, `admin/overview`,
> `admin/pets`, `admin/settings` existen como **carpetas vacías** (0 archivos, sin
> `page.tsx`) — navegar ahí da 404 real. Documentado ya en [[AUDITORIA_2026_08_11]];
> son scaffolding sin terminar, no rutas activas.

---

## 3. `(public)/` — rutas sin sesión

Sin layout propio — hereda directo del root `layout.tsx`.

| Carpeta | Ruta | `page.tsx` | Función |
|---|---|---|---|
| `login/` | `/login` | ~2200 líneas | Login + modal de registro (`?register=1`, abre `RegistroFlow`; precarga dueño/mascota desde `kittypau_demo_*` si viene de "Crear cuenta" en `/demo`) + modal "Personaliza tu demo" (perro/gato + dueño + mascota, sin email) que lleva a `/demo`. El "gato guía" animado (trial dialog IA con typing) se **eliminó** (spec 009 US4). Sigue siendo un monolito grande. |
| `login/_components/` | — | — | `registro-flow.tsx` — flujo de 4 pasos (cuenta → usuario → mascota → dispositivo). Movido acá el 2026-08-11: es el único consumidor real, `(app)/registro/page.tsx` solo redirige. |
| `reset/` | `/reset` | 165 líneas | Reset de contraseña (llega desde el link del email de Supabase Auth). |
| `demo/` | `/demo` | ~280 líneas | **Reescrita (spec 009).** Demo pública de UNA vista: pop-up "datos reales de un gato real desde abril 2026" (1×/sesión) → form "Personaliza tu demo" (perro/gato + dueño + mascota, sin email) → **`<TodayScreen mode="demo">`** = espejo EXACTO de `/today` de la mascota de demo con datos reales en vivo, con el nombre/dueño/avatar-gif del visitante encima + CTA "Crear cuenta". Ya NO acepta `?menu=`, ya NO usa `AppNav`, ya NO tiene datos de ejemplo ni gato guía. Lee el bundle de `GET /api/demo/today`. |
| `client-demo/` | `/client-demo` | 6 líneas | `redirect("/demo")` — alias legado (spec 009 FR-019). |
| `test/` | `/test` | 6 líneas | `redirect("/demo")` — alias legado (spec 009 FR-019). |
| `404/` | `/404` | 5 líneas | Ver nota en §1 — alias navegable de `not-found.tsx` para la APK. |
| `error/` | `/error` | 14 líneas | Ver nota en §1 — alias navegable de `error.tsx`/`global-error.tsx`, acepta `?type=` (`inferKittypauErrorTypeFromError`/`parseKittypauErrorType`). |

---

## 4. `_components/` (top-level) — compartidos entre route groups o entre root layout y páginas

| Archivo | Usado por |
|---|---|
| `app-nav.tsx` | `(app)/layout.tsx` **y** `(public)/demo/page.tsx` — cross-group, por eso vive acá y no dentro de `(app)`. Reestructurado 2026-09-14: en celular/APK es una barra fija **abajo** con grid (dueño/marca+bajada/redes sociales a la izquierda, menús al medio, tuerca-solo a la derecha para Ajustes/Editar perfil/Cerrar sesión). La tuerca renderiza siempre (antes gateada a `!useSidebarNav`, invisible para cuentas tester/cliente — bug real encontrado con Playwright); visibilidad la decide el CSS, no el JSX. 479 líneas. |
| `hunger-bar-card.tsx` | Card de la barra de hambre — ver [[05_API/SPEC_HungerBar_Alimentacion]] para la fórmula. Usada solo en `/pet` (`/today` tiene su propio fetch inline, no reusa este componente). |
| `diagnostico-rapido-card.tsx` | Panel "Diagnóstico rápido" (Conexión/Energía/Firmware + acciones recomendadas) — nació en `/bowl`, generalizado a `/today` y `/pet` (SPEC_02 U2). Lógica en `@/lib/device-diagnostics`, ver [[18_UI/Componentes/COMP_DiagnosticoRapidoCard]]. |
| `accessible-modal.tsx` | Modal reutilizable con `role="dialog"`, `aria-modal`, focus trap, Escape-to-close. |
| `alert.tsx` | Banner de alerta genérico (usado en `dispositivos/nuevo`, entre otros). |
| `empty-state.tsx` | Estado vacío genérico (sin datos aún). |
| `kittypau-error-screen.tsx` | Pantalla de error de marca — consumida por `error.tsx`, `global-error.tsx`, `not-found.tsx`, `(public)/404`, `(public)/error`. |
| `native-apk-mode.tsx` | Lógica específica del flavor Android (Capacitor) montada en el root layout. |
| `native-thanks-notification.tsx` | Notificación nativa post-acción en la APK. |
| `operational-actions-card.tsx` | Card de acciones operativas (tare, wifi, intervalo) del dispositivo. |
| `parallax-root.tsx` | Wrapper de `react-scroll-parallax` en el root layout. |
| `route-loading-overlay.tsx` | Overlay de carga entre navegaciones, en el root layout. |
| `social-links.tsx` | Links a redes sociales — usado en `login/` y `demo/`. |

Regla de ubicación: si un componente lo usa **una sola ruta**, va en el `_components/`
de esa ruta (ej. `today/_components/`). Si lo usan **dos o más route groups**, va acá.

---

## 5. `api/` — API Routes (Next.js Route Handlers)

30 `route.ts` + 4 helpers compartidos en la raíz de `api/`. Contrato completo de cada
endpoint en [[05_API/README_API]] — acá solo la relación carpeta ↔ dominio.

| Helper | Función |
|---|---|
| `_utils.ts` | `apiError`, `getUserClient`, `isAdminFallbackEmail`, `enforceBodySize`, `startRequestTimer`, `logRequestEnd` — usado por los 30 route.ts, ninguno quedó sin usarlo. |
| `_rate-limit.ts` | `checkRateLimit`, `getRateKeyFromRequest` — rate limiting por IP/usuario en endpoints sensibles (auth, mqtt/webhook, devices). |
| `_audit.ts` | `logAudit` — trazabilidad de eventos del bridge/dispositivos. |
| `_cache.ts` | `bumpAdminOverviewCacheVersion` y similares — invalidación de cache del panel admin. |

| Carpeta | Dominio |
|---|---|
| `devices/`, `devices/[id]/{category,events,interval,sessions,tare,wifi}/` | CRUD y acciones sobre dispositivos KPCL. |
| `pets/`, `pets/[id]/`, `pets/[id]/hunger-bar/` | CRUD de mascotas + endpoint de la barra de hambre. `hunger-bar/` extendido 2026-09-15 con un objeto `water` (`resolveWaterDevice`/`buildWaterSnapshot` en `hunger-bar-server.ts`) — portó a server el cálculo de % de agua que antes solo vivía client-side en `today-screen.tsx`, para que el widget nativo de Android (sin JS) lo pueda pedir directo. Ver `Knowledge/29_Specs/010-widget-android-hero/contracts/hunger-bar-water-extension.md`. |
| `readings/`, `readings/bucketed/` | Lecturas crudas y agregadas (paginación anti-cap de Supabase, ver commit `b1995e4`). |
| `analytics/daily/`, `analytics/sessions/` | Analítica agregada por día/sesión. |
| `auth/login/` | Login (Supabase Auth). |
| `account/type/` | Resuelve si el usuario es admin/tester/client. |
| `registro/status/` | Estado del flujo de alta (usado por `RegistroFlow`). |
| `onboarding/status/` | **Alias muerto**: solo hace `export { GET } from ".../registro/status/route"`, sin ningún caller — el frontend llama directo a `/api/registro/status`. Candidata a eliminar. |
| `mqtt/webhook/` | Ingesta de lecturas desde el bridge MQTT → Supabase. |
| `bridge/heartbeat/`, `bridge/health-check/` | Salud del bridge Raspberry. |
| `admin/access/`, `admin/overview/`, `admin/health-check/`, `admin/demo-ingresos/`, `admin/tests/run-all/`, `admin/finance/kpcl-catalog/` | Backend del panel `/admin`. |
| `demo/ingreso/` | Captura de leads desde `/demo` (alimenta `admin/demo-ingresos`). Acepta lead sin email (dedup por `visitor_id`), best-effort — si la RPC `record_demo_ingreso_v2` no está aplicada todavía, no rompe. |
| `demo/today/` | `GET /api/demo/today` — bundle público (sin sesión, solo lectura, rate-limited, scoped a los 2 devices de demo por env) con lo que `<TodayScreen mode="demo">` necesita. Sub-shapes de `hunger-bar` / `consumo-periodo` compartidos con las rutas autenticadas vía `lib/hunger-bar-server.ts`. Spec 009. |
| `profiles/` | Perfil de usuario/cuenta. |

---

## 6. Fuera de `src/app` pero mismo repo — widget nativo de Android (NUEVO, 2026-09-15)

No es parte del ruteo de Next.js — corre fuera del WebView de Capacitor, como
superficie nativa aparte del sistema operativo. Documentado acá porque es la primera
vez que el proyecto tiene código Kotlin (antes 100% Java) y porque varios archivos
de `src/app`/`src/lib` de arriba existen específicamente para conectarlo. Spec
completo: [[29_Specs/010-widget-android-hero/spec]].

| Archivo | Función |
|---|---|
| `kittypau_app/android/app/src/main/java/com/kittypau/app/widget/KittypauHeroWidget.kt` | Composable Glance (no RemoteViews clásico — justificado contra el ladder de Ponytail, produce menos código para este layout). 4 estados: normal, sin dispositivo, offline con último dato, sesión inválida. |
| `.../widget/KittypauHeroWidgetReceiver.kt` | `GlanceAppWidgetReceiver` — encola/cancela el refresco (`WidgetRefreshWorker`), limpia config al quitar el widget. |
| `.../widget/WidgetPetConfigActivity.kt` | Configuration Activity — Android la lanza sola después de bindear el widget (tanto por el selector manual como por `requestPinAppWidget()`), lista de mascotas vía `GET /api/pets`. |
| `.../widget/WidgetAuthBridge.kt` | Lee el refresh token de `@capacitor/preferences` (storage nativo `"CapacitorStorage"`, plano — verificado contra el código fuente del plugin, NO encriptado, mismas garantías que el `localStorage` de antes), lo canjea contra Supabase Auth. Distingue sin-conexión de sesión-inválida por código HTTP. |
| `.../widget/WidgetRefreshWorker.kt` | WorkManager, piso real 15 min. |
| `com/kittypau/app/KittypauWidgetPlugin.kt` | Plugin Capacitor propio — expone `requestPin()` a JS, dispara `AppWidgetManager.requestPinAppWidget()`. Es el botón "Agregar widget" en `/today` (ver §2 arriba) el que lo llama. |
| `com/kittypau/app/KittypauMessagingService.kt` | Extiende la `MessagingService` de `@capacitor/push-notifications` (no la reemplaza — FCM solo entrega a UNA por app) para disparar refresco inmediato del widget cuando llega push de "comió"/"le sirvieron" (T022, opcional). |
| `kittypau_app/src/lib/hooks/useAddWidgetToHomeScreen.ts` + `src/lib/native/kittypau-widget-plugin.ts` | Lado JS del puente — mismo patrón de `usePushTokenRegistration.ts` (import dinámico, no-op fuera de la APK). |

**Gap real conocido**: este entorno de desarrollo (Claude Code) no tiene Android
SDK/JDK — todo el código Kotlin/XML se escribió y revisó por lectura, sin compilar
acá. Se armó `.github/workflows/build-android-apk.yml` para compilarlo en GitHub
Actions en su lugar (ver [[19_DevOps/README_DevOps]]). Varios bugs reales de
compilación ya se encontraron y corrigieron así (namespace XML mal escrito, `--`
dentro de comentarios XML —inválido—, JDK 17 vs. 21, plugin de Compose faltante).

---

## 7. Hallazgos de esta pasada (2026-08-11)

- **`(public)/register`**: eliminada. Estaba huérfana (cero referencias en código,
  `supabase/` — templates de email, redirect URLs — y Docs). El registro real es
  `RegistroFlow` en `/login`. Confirmado con Mauro antes de borrar.
- **`api/onboarding/status`**: alias de 1 línea a `api/registro/status`, sin caller
  interno — pero **no es basura accidental**. Se creó a propósito en el commit
  `322eb94` (migración "onboarding" → "Registro Kittypau") para no romper una APK ya
  instalada que aún llamara a la URL vieja. Costo de mantenerlo es cero (1 línea):
  **se deja**, no se elimina.
- **`(app)/admin/page.tsx`** sigue siendo el monolito más grande de la app (3799 líneas,
  bajando), más que `today/page.tsx` (2493) y `login/page.tsx` (1977). Extracción por
  componentes **en curso** desde el 2026-08-12 (batch 1/N hecho) — ver
  [[29_Specs/SPEC_02_UIUX_Mejoras]] ítem A-C1 para el plan de los batches siguientes.
- **`(app)/inicio`**: el nombre sugiere "dashboard" pero es 100% redirect a `/today`.
  `README_Frontend.md` lo listaba como "Dashboard principal" — corregido.
- Carpetas `_components`/`_lib` privadas ya confirmadas correctamente ubicadas tras
  mover `app-nav.tsx` y `registro-flow.tsx` (commit `9128ad0`) — sin más casos
  cross-group pendientes.

---

## Ver también

- [[04_Frontend/README_Frontend]] — stack, scripts npm, flujo de auth, MQTT
- [[18_UI/Componentes/README_Componentes]] — doc por componente extraído
- [[05_API/README_API]] — contratos de cada endpoint
- [[29_Specs/010-widget-android-hero/spec]] — spec/plan/tasks completos del widget nativo de Android (§6 arriba)
- [[AUDITORIA_2026_08_11]] — auditoría anterior, Knowledge vs código en vivo
- [[AUDITORIA_2026_09_15]] — auditoría vigente, cubre todo lo cambiado desde la anterior (rediseño `/today`, navbar, widget)
