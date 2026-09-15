# Implementation Plan: Widget de Android — mini-hero de la mascota

**Branch**: `010-widget-android-hero` | **Date**: 2026-09-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `Knowledge/29_Specs/010-widget-android-hero/spec.md`

## Summary

Widget nativo de Android (grilla 2×4) que muestra en vivo el mini-hero de una mascota (foto,
barra de comida, barra de agua, círculo de comidas de hoy, círculo de agua sin número, últimas
horas de comida/agua) sin abrir la app, construido con Jetpack Glance sobre datos que ya calcula
`GET /api/pets/:id/hunger-bar` (extendido con un objeto `water` nuevo). **Además del widget en
sí, este feature agrega un botón dentro de la APK** (al final del feed de `/today`) que dispara
`AppWidgetManager.requestPinAppWidget()` a través de un plugin nativo de Capacitor propio, para
que agregar el widget sea un flujo de un tap desde adentro de la app — objetivo explícito de
Mauro, no una mejora opcional (ver `research.md` Decisión 2). Selección de mascota al agregar
usa el mecanismo estándar de Android (configuration Activity), refresco combina WorkManager
periódico + push data-only sobre la infraestructura FCM ya existente (spec 008), y la
autenticación en background usa `@capacitor/preferences` para persistir el refresh token de
Supabase.

## Technical Context

**Language/Version**: Kotlin (JDK 21, alineado a AGP 8.13.2) para todo lo nativo nuevo;
TypeScript/Next.js 16 para la extensión de API y el botón in-app — mismos stacks ya en uso en
el proyecto, sin versiones nuevas a decidir.

**Primary Dependencies**: `androidx.glance:glance-appwidget` (nueva, research.md Decisión 1),
`androidx.work:work-runtime-ktx` (nueva, a confirmar si ya viene transitiva con Capacitor
8.5.0 — chequeo de `/speckit-tasks`), `@capacitor/preferences` (nueva, ya recomendada en
`SPEC_06_Mobile_APK_2026.md`), `AppWidgetManager` (plataforma, sin dependencia), plugin
Capacitor propio sin librería externa (`KittypauWidgetPlugin.kt`).

**Storage**: Supabase (ya existente, sin tablas nuevas — ver `data-model.md`) + `SharedPreferences`
nativas de Android para configuración/caché por `appWidgetId` + `@capacitor/preferences`
(respaldado por `EncryptedSharedPreferences`) para el refresh token en background.

**Testing**: Vitest para la extensión de `hunger-bar/route.test.ts` (corre en este entorno, ver
`quickstart.md` Paso 1); verificación manual en dispositivo/emulador para todo lo de Android
(no automatizable en `/speckit-tasks` de forma realista para un equipo de 2 personas en esta
primera versión — el proyecto tampoco tiene tests instrumentados de Android hoy).

**Target Platform**: Android 7.0+ (API 24, `minSdkVersion` ya fijado en `variables.gradle`, no
se toca). `requestPinAppWidget()` requiere API 26+; por debajo de eso (API 24-25) el botón
in-app cae al fallback instructivo (research.md Decisión 2) — el widget en sí sigue siendo
agregable manualmente en cualquier versión soportada por el proyecto.

**Project Type**: mobile-app + web-service (Next.js API existente extendida + módulo Android
nativo nuevo dentro del proyecto Capacitor ya generado).

**Performance Goals**: SC-001 (legible en <2s de mirar la pantalla de inicio, sin trabajo
async visible — el widget siempre pinta el último snapshot cacheado, nunca espera un fetch en
pantalla), SC-002 (cambios reflejados en ≤30 min, cumplido por el piso de WorkManager de 15 min
solo, mejorado por el canal de push).

**Constraints**: Glance/RemoteViews-compatible únicamente (sin WebView, sin React/CSS — spec
Contexto); offline-tolerant (FR-010); sin fabricar datos en ningún campo (FR-015, no-negociable
del proyecto, "copy honesto"); sin tocar `barras-sims-card.tsx` (widget web protegido); sin
tocar `/admin`; sin reescribir `variables.gradle`/config de Gradle-AGP ya resuelta.

**Scale/Scope**: 1 `AppWidgetProvider`/`GlanceAppWidgetReceiver`, 1 configuration Activity, 1
`WorkManager` worker, 1 plugin Capacitor propio (1 método), 1 extensión de endpoint existente,
1 botón nuevo en una pantalla existente (`/today`, al final del feed). Sin pantallas nuevas del lado web más
allá de ese botón.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Ponytail | Glance (dependencia nueva) justificado explícitamente contra el ladder en `research.md` Decisión 1 — produce menos código real que la alternativa "sin dependencia nueva" (RemoteViews), no más. Reusa `hunger-bar` en vez de crear endpoint nuevo (Decisión 3), reusa infraestructura de push existente en vez de construir un canal nuevo (Decisión 5), reusa el mecanismo estándar de configuration Activity de Android en vez de un flujo custom de 2 pasos (Decisión 2). **PASA**. |
| II. Fix causa raíz | N/A — no es un fix de bug. |
| III. No-negociables | FR-015/"copy honesto" es el requisito central del feature, ya resuelto explícitamente en el spec (Pregunta 1) y llevado a los contratos (`hunger-bar-water-extension.md`: `water` nunca incluye conteo de veces). Trust boundary del endpoint extendido reusa el auth/ownership ya existente en `hunger-bar/route.ts`, no se relaja. **PASA**. |
| IV. Arquitectura de datos | N/A — no toca `readings.csv`/`readings_rows.csv`, solo lee vía los mismos caminos que ya usa `/today`. |
| V. Motor matemático | N/A — no toca `shape_features_v2.py`. |
| VI. IoT/Firmware | N/A — no toca `iot_firmware/`. |
| VII. Knowledge Vault | Spec y plan fundamentados en archivos reales citados (`SPEC_06_Mobile_APK_2026.md`, `SPEC_HungerBar_Alimentacion.md`, `008-push-notifications-fcm/plan.md`, código real leído). **PASA**. |
| VIII. 2 PCs | `plan.md` vive en `Knowledge/29_Specs/010-widget-android-hero/` (branch ya creada por el setup script: `010-widget-android-hero`). El gap real de build (Decisión 0) se documenta explícitamente para no asumir que este entorno puede verificar la parte Android — evita el error que la regla busca prevenir (pisar/perder trabajo por asumir un estado que no es real). **PASA**. |
| Convivencia `Knowledge/29_Specs/` | `.specify/feature.json` ya apunta a `Knowledge/29_Specs/010-widget-android-hero` (confirmado). **PASA**. |

**Resultado**: sin violaciones. No hace falta la tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
Knowledge/29_Specs/010-widget-android-hero/
├── spec.md
├── plan.md              # este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── hunger-bar-water-extension.md
│   └── widget-pin-plugin.md
└── tasks.md              # generado por /speckit-tasks (no acá)
```

### Source Code (repository root)

```text
kittypau_app/
├── src/
│   ├── app/
│   │   ├── api/pets/[id]/hunger-bar/
│   │   │   ├── route.ts                 # EXTENDER: agregar objeto `water` a la respuesta
│   │   │   └── route.test.ts            # EXTENDER: casos nuevos para `water`
│   │   └── (app)/today/_components/today-screen.tsx  # EXTENDER: botón "Agregar widget" al final del feed (solo modo APK nativo)
│   └── lib/
│       ├── hunger-bar-server.ts         # EXTENDER: resolveWaterDevice() + cálculo de water%
│       └── hooks/
│           └── useAddWidgetToHomeScreen.ts   # NUEVO: puente al plugin nativo (patrón de usePushTokenRegistration.ts)
│
└── android/app/src/main/
    ├── java/com/kittypau/app/widget/
    │   ├── KittypauHeroWidget.kt              # NUEVO: composable Glance, los 4 estados (normal/sin-dispositivo/offline/sesión-inválida)
    │   ├── KittypauHeroWidgetReceiver.kt      # NUEVO: GlanceAppWidgetReceiver
    │   ├── WidgetPetConfigActivity.kt         # NUEVO: configuration Activity, lista de mascotas (GET /api/pets)
    │   ├── WidgetRefreshWorker.kt             # NUEVO: WorkManager periódico + trigger por push data-only
    │   └── WidgetAuthBridge.kt                # NUEVO: lee refresh token de @capacitor/preferences, canjea por access token
    ├── java/com/kittypau/app/
    │   └── KittypauWidgetPlugin.kt            # NUEVO: plugin Capacitor, expone requestPin()
    ├── res/xml/
    │   └── kittypau_hero_widget_info.xml      # NUEVO: AppWidgetProviderInfo (2x4 cells, android:configure)
    └── AndroidManifest.xml                    # EXTENDER: registrar receiver + configuration Activity + registrar el plugin

android/app/build.gradle                        # EXTENDER: agregar glance-appwidget + work-runtime-ktx
kittypau_app/package.json                        # EXTENDER: agregar @capacitor/preferences
```

**Structure Decision**: se extiende la estructura mobile+API ya existente (Next.js API +
proyecto Android generado por Capacitor bajo `kittypau_app/android/`) — no se crea ningún
directorio de nivel superior nuevo. Todo el código Android nuevo vive en un paquete propio
(`com.kittypau.app.widget`) separado del resto de `com.kittypau.app`, para que quede claro qué
archivos pertenecen a este feature. `variables.gradle` y el resto de la config de Gradle/AGP
(`compileSdkVersion`/`targetSdkVersion`/`minSdkVersion`, ya resueltos en `SPEC_06`) no se tocan.

## Complexity Tracking

*Sin violaciones a justificar — tabla omitida (ver Constitution Check).*
