---
id: estructura_src_app
title: "Estructura de src/app — función de cada carpeta"
type: frontend
status: active
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
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
| `today/` | `/today` | 2468 líneas | Pantalla principal: actividad del día, Barras Sims (comida/agua), wellness de plato, timeline día/noche, hunger bar, modo guía. El `page.tsx` más grande de la app después de `admin/`; parcialmente extraído a `today/_components/` y `today/_lib/` (ver [[18_UI/Componentes/README_Componentes]]). |
| `today/_components/` | — | — | `barras-sims-card.tsx`, `bowl-wellness-card.tsx`, `day-night-timeline-card.tsx`, `onboarding-guide-modal.tsx` — componentes presentacionales extraídos de `today/page.tsx`. Privados a esta ruta (nadie más los importa). |
| `today/_lib/` | — | — | `today-format.tsx` — helpers puros de formato (labels de batería/conectividad, `renderTrend`, clases de tono) sin estado, movidos fuera de `page.tsx`. |
| `bowl/` | `/bowl` | 1825 líneas | Monitoreo en vivo del comedero vía MQTT directo desde el browser (`useMqttLive`) — peso, estado, sin polling. |
| `pet/` | `/pet` | 907 líneas | Perfil de la mascota (datos, foto, historial de dispositivo asociado). |
| `story/` | `/story` | 708 líneas | Historial y análisis de sesiones/consumo. |
| `settings/` | `/settings` | 492 líneas | Configuración de cuenta/dispositivo. |
| `dispositivos/` | — | **sin `page.tsx`** | `/dispositivos` (raíz) da 404 real. Solo existe para agrupar el subpath `nuevo/`. |
| `dispositivos/nuevo/` | `/dispositivos/nuevo` | 274 líneas | Alta manual de un KPCL a una mascota existente (código `KPCLxxxx`, tipo comida/agua). |
| `registro/` | `/registro` | 21 líneas | **Solo redirect** a `/login?register=1`. El flujo real de alta de cuenta+mascota+dispositivo (`RegistroFlow`, 4 pasos) vive en `(public)/login/_components/`, no acá — ver nota de reorganización más abajo. |
| `admin/` | `/admin` | 4043 líneas | Panel administrador — el `page.tsx` más grande de toda la app. Dashboard con métricas, salud del sistema, dispositivos, mascotas. |
| `admin/demo-ingresos/` | `/admin/demo-ingresos` | 148 líneas | Lista de leads capturados desde `/demo` (tabla con email, mascota, primer/último visto, contador). |
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
| `login/` | `/login` | 1977 líneas | Login + modal de registro (`?register=1`, abre `RegistroFlow`) + demo animada del gato (trial dialog con typing effect, easter egg). El segundo `page.tsx` más grande de la app. |
| `login/_components/` | — | — | `registro-flow.tsx` — flujo de 4 pasos (cuenta → usuario → mascota → dispositivo). Movido acá el 2026-08-11: es el único consumidor real, `(app)/registro/page.tsx` solo redirige. |
| `reset/` | `/reset` | 165 líneas | Reset de contraseña (llega desde el link del email de Supabase Auth). |
| `demo/` | `/demo` | 557 líneas | Demo pública sin login, acepta `?menu=today\|story\|pet\|bowl` para mostrar cada pantalla con datos de ejemplo. Usa `AppNav` (por eso ese componente tuvo que subir a `_components/` top-level). |
| `client-demo/` | `/client-demo` | 35 líneas | Verificado en vivo: renderiza el mismo contenido que `/demo` (wrapper/alias). |
| `test/` | `/test` | 41 líneas | Verificado en vivo: igual que `/demo` — no es una página de test real. |
| `404/` | `/404` | 5 líneas | Ver nota en §1 — alias navegable de `not-found.tsx` para la APK. |
| `error/` | `/error` | 14 líneas | Ver nota en §1 — alias navegable de `error.tsx`/`global-error.tsx`, acepta `?type=` (`inferKittypauErrorTypeFromError`/`parseKittypauErrorType`). |

---

## 4. `_components/` (top-level) — compartidos entre route groups o entre root layout y páginas

| Archivo | Usado por |
|---|---|
| `app-nav.tsx` | `(app)/layout.tsx` **y** `(public)/demo/page.tsx` — cross-group, por eso vive acá y no dentro de `(app)`. |
| `hunger-bar-card.tsx` | Card de la barra de hambre — ver [[05_API/SPEC_HungerBar_Alimentacion]] para la fórmula. |
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
| `pets/`, `pets/[id]/`, `pets/[id]/hunger-bar/` | CRUD de mascotas + endpoint de la barra de hambre. |
| `readings/`, `readings/bucketed/` | Lecturas crudas y agregadas (paginación anti-cap de Supabase, ver commit `b1995e4`). |
| `analytics/daily/`, `analytics/sessions/` | Analítica agregada por día/sesión. |
| `auth/login/` | Login (Supabase Auth). |
| `account/type/` | Resuelve si el usuario es admin/tester/client. |
| `registro/status/` | Estado del flujo de alta (usado por `RegistroFlow`). |
| `onboarding/status/` | **Alias muerto**: solo hace `export { GET } from ".../registro/status/route"`, sin ningún caller — el frontend llama directo a `/api/registro/status`. Candidata a eliminar. |
| `mqtt/webhook/` | Ingesta de lecturas desde el bridge MQTT → Supabase. |
| `bridge/heartbeat/`, `bridge/health-check/` | Salud del bridge Raspberry. |
| `admin/access/`, `admin/overview/`, `admin/health-check/`, `admin/demo-ingresos/`, `admin/tests/run-all/`, `admin/finance/kpcl-catalog/` | Backend del panel `/admin`. |
| `demo/ingreso/` | Captura de leads desde `/demo` (alimenta `admin/demo-ingresos`). |
| `chatbot-gato/` | Backend del chatbot IA (ver `src/chatbot-gato/`). |
| `profiles/` | Perfil de usuario/cuenta. |

---

## 6. Hallazgos de esta pasada (2026-08-11)

- **`(public)/register`**: eliminada. Estaba huérfana (cero referencias en código,
  `supabase/` — templates de email, redirect URLs — y Docs). El registro real es
  `RegistroFlow` en `/login`. Confirmado con Mauro antes de borrar.
- **`api/onboarding/status`**: alias de 1 línea a `api/registro/status`, sin caller
  interno — pero **no es basura accidental**. Se creó a propósito en el commit
  `322eb94` (migración "onboarding" → "Registro Kittypau") para no romper una APK ya
  instalada que aún llamara a la URL vieja. Costo de mantenerlo es cero (1 línea):
  **se deja**, no se elimina.
- **`(app)/admin/page.tsx`** (4043 líneas) es ahora el monolito más grande de la app,
  más que `today/page.tsx` (2468) y `login/page.tsx` (1977). Evaluado y agregado como
  ítem A-C1 en [[29_Specs/SPEC_02_UIUX_Mejoras]] — estructura ya inspeccionada (~15
  secciones delimitadas por `<h2>`, mismo patrón extraíble que `today/`), pero
  **dejado de lado a propósito por Mauro**, no priorizar sin pedido explícito.
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
- [[AUDITORIA_2026_08_11]] — auditoría completa Knowledge vs código en vivo
