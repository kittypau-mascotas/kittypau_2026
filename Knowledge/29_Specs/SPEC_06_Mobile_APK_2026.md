---
id: spec_06_mobile_apk_2026
title: SPEC 06 — Modernización del APK móvil (Capacitor, Android 16, UX 2026)
type: spec
status: draft
owner: Mauro
created: 2026-08-12
updated: 2026-08-12
tags:
  - spec
  - capacitor
  - android
  - mobile
  - ux
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[04_Frontend/README_Frontend]]
  - [[05_API/SPEC_HungerBar_Alertas]]
  - [[19_DevOps/README_DevOps]]
  - [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]]
---

# SPEC 06 — Modernización del APK móvil

> Contexto: la app es un **híbrido Capacitor** — el WebView carga `kittypau-app.vercel.app`
> en vivo (`capacitor.config.ts` → `server.url`), no un bundle offline. Esto importa para
> todo lo que sigue: **el JS se actualiza solo con cada deploy de Vercel, pero cualquier
> recurso nativo (permisos, íconos, plugins, SDK target) necesita un APK nuevo compilado e
> instalado** — lección aprendida en vivo el 2026-08-12 con la notificación push del hunger
> bar (ver [[05_API/SPEC_HungerBar_Alertas]] §6.1: el APK instalado no tenía el plugin
> `@capacitor/local-notifications` compilado adentro pese a que el código JS ya llamaba a su
> API).

---

## 🔴 Urgente — plazo de Google Play, no es una mejora opcional

### A1 — `targetSdkVersion` en 35, Google Play exige 36 desde el 31 de agosto de 2026

> ✅ **Hecho (2026-08-12).** `compileSdkVersion`/`targetSdkVersion` 35→36,
> `minSdkVersion` 23→24, `SystemBars` configurado en `capacitor.config.ts` (edge-to-edge).
> Cadena de bumps real, descubierta compilando (no supuesta): androidx 1.11.0/1.17.0 exigen
> AGP ≥8.9.1 (estaba en 8.7.2) → subido a **8.13.2** (último estable de la rama 8.x, sin
> saltar a AGP 9.x); AGP 8.13.2 exige Gradle ≥8.13 (estaba en 8.11.1) → subido a **8.14.5**.
> `gradlew assembleDebug` compila limpio. **Falta:** verificar edge-to-edge visualmente en
> el celular de Mauro (APK nuevo mandado por WhatsApp, mismo flujo que la notificación push).

**Hoy es 2026-08-12 — quedan ~19 días.** Desde esa fecha, Google Play **rechaza** apps nuevas
o actualizaciones que no targeteen Android 16 (API 36), salvo extensión aprobada
explícitamente.

```
kittypau_app/android/variables.gradle
  compileSdkVersion = 35   →  36
  targetSdkVersion   = 35   →  36
  minSdkVersion      = 23   →  24 (Capacitor 8 ya no soporta 23, ver A2)
```

**Bloqueante real:** subir a 36 activa **edge-to-edge obligatorio** (Android 16 ya no deja
optar por el comportamiento viejo) — la UI tiene que manejar los insets de status
bar/navigation bar o el contenido queda debajo de ellos. Capacitor 8 (ya instalado) trae un
plugin nuevo específico para esto, **System Bars**, que reemplaza la config vieja
`android.adjustMarginsForEdgeToEdge` (removida). Sin adoptarlo, subir el SDK target puede
romper visualmente el layout.

**Esfuerzo:** M (bump de SDK + adoptar System Bars + probar cada pantalla con edge-to-edge).
**Impacto:** Alto — bloquea publicar en Play Store pasado el plazo, no es cosmético.

**Pendiente de pulir, no bloqueante:** `globals.css` ya tenía `env(safe-area-inset-*)`
extenso de trabajo previo (~15 usos), pero `system-bars.md` de Capacitor documenta un bug de
WebView Android <140 donde `env()` solo no alcanza — el patrón robusto es
`var(--safe-area-inset-top, env(safe-area-inset-top, 0px))` (la var la inyecta el plugin
como fallback). No se reescribió todo el CSS existente en esta pasada — bajo riesgo (la
mayoría de WebView activo en 2026 ya es ≥140), pero anotado para cuando se audite cada
pantalla con edge-to-edge real.

### A2 — `@capacitor/cli` en v8 requiere Node ≥22, esta máquina tiene Node 20

> ⚠️ **Bloqueado, necesita decisión de Mauro (2026-08-12).** `@capacitor/core` y
> `@capacitor/android` ya están en `8.5.0` (última). Se intentó subir `@capacitor/cli` a
> `8.5.0` también — **falla explícitamente**: `The Capacitor CLI requires NodeJS >=22.0.0`.
> La máquina de desarrollo tiene Node v20.19.6. Se revirtió el CLI a `^7.6.0` (confirmado
> que sigue funcionando bien con core/android en 8.x — `cap sync`/`assembleDebug` corrieron
> sin problema durante todo A1).

**Dos caminos, sin apuro real** (a diferencia de A1, esto no tiene fecha límite de Play
Store):
1. Actualizar Node del sistema a ≥22 (nvm-windows, o reinstalar Node) y recién ahí subir
   `@capacitor/cli` a `8.5.0` — alinea todo, pero es un cambio de entorno que puede afectar
   otros proyectos en esta máquina, no solo Kittypau.
2. Quedarse en `@capacitor/cli@7.6.0` indefinidamente — ya probado que funciona con
   core/android 8.x en esta sesión. El CLI viejo puede no soportar features nuevas del
   ecosistema v8 (ej. templates), pero para `sync`/`build`/`add` diario no mostró problemas.

**Esfuerzo:** XS si se elige el camino 2 (no hacer nada). M si se elige el camino 1
(upgrade de Node + validar que nada más en la máquina se rompa). **Impacto:** Bajo — no
bloquea nada de lo que se hizo en A1.

---

## 🟢 Plugins de Capacitor recomendados (oficiales, con justificación puntual para esta app)

No es una lista genérica — cada uno resuelve algo concreto que ya existe o casi existe en
el producto:

| Plugin | Por qué esta app lo necesita |
|---|---|
| `@capacitor/haptics` | Feedback táctil al tarar báscula, confirmar alimentación, o cuando se dispara la alerta del hunger bar — estándar en cualquier app 2026, instalación de una línea. |
| `@capacitor/app` | Maneja el botón atrás nativo (`backButton` listener) — **necesario** para el cambio de predictive-back de Android 16 (ya no se puede confiar en `onBackPressed()` con `targetSdk 36`). También da deep-linking (Android App Links) para que el enlace de confirmación de registro o el de reset de password abran la app directo en vez de un browser. |
| `@capacitor/preferences` | Storage nativo key-value — reemplazo idiomático de los usos actuales de `localStorage` (ej. `kp_native_thanks_notif_v1` en `native-thanks-notification.tsx`) que sobrevive mejor a limpiezas de WebView storage. |
| System Bars (parte de `@capacitor/core` v8) | Ver A1 — obligatorio para edge-to-edge en Android 16, no es opcional para esta lista. |
| `@capacitor/share` | Compartir un resumen de "Story" o una captura del hunger bar — encaja con el pilar de "confianza en los datos" (SPEC_02 U2/03 Pilar 4): que el dueño pueda mostrarle el estado real de su mascota a otra persona (veterinario, familia). |

**Evaluado y descartado por ahora** (no encaja con esta app o es demasiado trabajo para el
valor):
- Widgets de pantalla de inicio — requiere código nativo Kotlin/Glance por fuera de
  Capacitor, no hay plugin que lo resuelva; recién tendría sentido si "ver el % del hunger
  bar sin abrir la app" se vuelve un pedido explícito de usuarios reales.
- Live Activities / Dynamic Island — es iOS-only y la app hoy es Android-only en producción.

---

## 🔵 Gap real: emparejamiento físico del device (WiFi) y alta en la app, desconectados

> Encontrado 2026-08-14 revisando `dispositivos/nuevo/page.tsx` contra
> [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] (captive portal del firmware) — no es
> hipotético, es el flujo real hoy.
>
> **Distinto de [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]]:** esto es
> conectividad (device↔router, primera vez que un KPCL sin WiFi se conecta a internet).
> SPEC_10 es propiedad (device↔usuario, elegir cuál de los devices ya online vincular a tu
> cuenta) — ese es el que Mauro priorizó el 2026-08-14 porque corre hoy en `registro-flow.tsx`
> con testers reales. Esta sección de acá importa recién cuando haya clientes nuevos
> provisionando hardware propio, no antes.

**Flujo actual, en dos partes que no se hablan entre sí:**

1. **Firmware:** un KPCL sin WiFi conocido levanta un AP `AIoTChile-KPCLxxxx`
   (`captive_portal.cpp:151-152`) y sirve un formulario en `192.168.4.1` para cargar la red
   del hogar — **fuera de la app**, en el browser del teléfono, conectado manualmente a esa
   red desde Ajustes del sistema.
2. **App:** `dispositivos/nuevo/page.tsx` solo hace un `POST /api/devices` con
   `device_id`/`device_type`/`pet_id` — asume que el device **ya** está online y publicando
   por MQTT. No hay paso intermedio, no verifica que el device efectivamente llegó a
   conectarse, y redirige a `/bowl` a los 1.2s sin chequear nada (línea 126).

**Lo que ya existe y SÍ sirve** (no reinventar): `/bowl` tiene UI de gestión de WiFi
(`handleAddWifi`/`handleRemoveWifi`, `api/devices/[id]/wifi/route.ts`) — pero es para
**agregar una red de respaldo a un device que ya está online**, viaja por
`device_commands` → bridge → MQTT, que solo le llega al device si ya tiene conexión. No
sirve para el primer emparejamiento (device sin ninguna red configurada todavía).

**Qué falta, concretamente:**

1. **Guiar el paso 1 desde la app**, no reemplazarlo — Android 10+ no deja que una app
   conecte el teléfono a una red WiFi arbitraria en silencio (API `WifiManager.enableNetwork`
   removida; `WifiNetworkSuggestion`/`ConnectivityManager.requestNetwork` requieren APIs más
   nuevas y no garantizan que el usuario efectivamente conmute). El patrón realista es un
   deep link a Ajustes WiFi del sistema (`Settings.Panel.ACTION_WIFI` vía un intent nativo,
   no hay plugin oficial de Capacitor para esto — evaluar `@capacitor-community/*` o un
   plugin custom mínimo) con instrucciones en pantalla ("conectate a `AIoTChile-KPCLxxxx`,
   volvé acá cuando termines").
2. **Cerrar el loop de verificación** — después del `POST /api/devices`, no redirigir a
   ciegas: pollear `devices.last_seen`/`device_state` (mismo indicador 🟢🔴⚫ que ya usa el
   resto de la app, ver `CLAUDE.md`) unos segundos y mostrar "esperando que el dispositivo se
   conecte..." en vez de asumir éxito. Si no llega a conectar en un plazo razonable (ej. 60s),
   decir explícitamente "no detectamos el dispositivo" en vez de dejar al usuario con un
   `/bowl` que simplemente no muestra datos.

**No es una feature grande de golpe** — el punto 2 (polling + feedback honesto) es bajo
esfuerzo y ya sigue el patrón de indicador de estado que existe en toda la app. El punto 1
(deep link a WiFi settings) es más chico de lo que suena pero requiere confirmar si hace
falta un plugin nativo o alcanza con `Intent.ACTION_VIEW`/settings scheme desde Capacitor.

**Esfuerzo:** S (punto 2, polling) + S-M (punto 1, deep link + investigar plugin).
**Impacto:** Medio-alto — es la primera impresión de cualquier usuario nuevo con hardware
real, y hoy no tiene ningún feedback si el emparejamiento físico falla.

---

## 🎨 Qué espera un usuario de una app móvil bien hecha en 2026

Filtrado a lo que aplica a un **WebView híbrido**, no a una app 100% nativa:

1. **Edge-to-edge + insets correctos** (ver A1) — contenido detrás de la status bar con
   scrim, no cortado por ella. Ya obligatorio, no es tendencia, es requisito.
2. **Predictive back gesture** — el usuario ve una previsualización de a dónde vuelve antes
   de soltar el gesto de "atrás". Requiere el listener de `@capacitor/app` (ver tabla
   arriba) en vez de depender del comportamiento por defecto del WebView.
3. **Splash screen con la API moderna** (`androidx.core:core-splashscreen`, ya está en
   `variables.gradle` como `coreSplashScreenVersion = '1.0.1'` — confirmar que
   `capacitor.config.ts` no tiene configuración vieja de splash pre-Android-12 sin migrar).
4. **Haptics en cada confirmación de acción** — tarar báscula, guardar cambios, alerta
   activada (ver tabla de plugins).
5. **Biometría en vez de contraseña para reingresar** — el login actual es 100%
   email+password (`(public)/login/page.tsx`); un `credentials.get()`/passkey o
   `@capacitor/biometric-auth` para reabrir sesión ya guardada reduce fricción — no
   reemplaza el registro inicial, solo el reingreso.
6. **Manejo offline explícito** — ya existe parcialmente (banners de "MQTT no configurado",
   "sin evidencia real"), pero vale auditar que ninguna pantalla quede en blanco/loading
   infinito sin conexión — coincide con SPEC_02 I2 (skeletons) ya identificado.
7. **Material You / color dinámico** — Android 12+ deja que el ícono/tema del sistema
   adopte el color dominante del wallpaper del usuario; no aplica directo a una WebView con
   su propio theming CSS, pero el ícono de la app y los elementos nativos (status bar,
   splash) sí pueden respetarlo vía `dynamicColors` en el tema Android — bajo impacto para
   esta app, mencionado por completitud, no priorizar.

---

## Herramientas de desarrollo — no existe un "MCP de Android Studio"

Se evaluó explícitamente a pedido de Mauro (2026-08-12): no hay un MCP server para Android
Studio/Gradle en el ecosistema actual de Claude Code. **No hace falta** — el mismo resultado
ya se logra por CLI directo, que es lo que se usó en esta sesión:

- `gradlew.bat assembleDebug` (con `JAVA_HOME` apuntando al JDK embebido de Android Studio,
  `C:\Program Files\Android\Android Studio\jbr`) — compila el APK, sin abrir la IDE.
- `adb install -r <apk>` (con el celular conectado por USB o `adb pair` inalámbrico) —
  instala directo, sin pasar por Android Studio.
- `npx cap sync android` — sincroniza `capacitor.config.ts` + plugins nuevos al proyecto
  nativo antes de compilar.

Este flujo ya está probado y funcionando en esta sesión (APK compilado dos veces, con
ícono corregido en el segundo intento). Lo único que requiere intervención humana es
autorizar la conexión del dispositivo (USB o inalámbrica) — no hay forma de saltear eso.

---

## Priorización

| # | Item | Esfuerzo | Impacto | Urgencia |
|---|---|---|---|---|
| 1 | ~~A1 — `targetSdk`/`compileSdk` 36 + System Bars~~ | M | Alto | ✅ Hecho 2026-08-12, falta verificar en dispositivo |
| 2 | A2 — decidir Node ≥22 vs quedarse en `@capacitor/cli@7.6.0` | XS-M | Bajo | Sin apuro, decisión de Mauro |
| 3 | `@capacitor/app` — predictive back + deep links | S | Medio | Ligada a A1 (mismo cambio de comportamiento de Android 16) |
| 4 | `@capacitor/haptics` | XS | Bajo/medio | Cuando haya ancho |
| 5 | `@capacitor/preferences`, `@capacitor/share`, biometría | S-M c/u | Medio | Sin apuro, evaluar una por una |
| 6 | Endurecer `env(safe-area-inset-*)` con fallback `var(--safe-area-inset-*, ...)` en `globals.css` | S | Bajo | No bloqueante, WebView <140 es minoría en 2026 |
| 7 | Cerrar el gap de emparejamiento físico WiFi ↔ alta en la app (`dispositivos/nuevo`) — ver sección dedicada arriba | S (polling) + S-M (deep link) | Medio-alto | Sin apuro pero es la primera experiencia con hardware real |

---

## Ver también

- [[05_API/SPEC_HungerBar_Alertas]] §6.1 — el caso real que expuso la brecha JS-deploy vs APK nativo
- [[04_Frontend/README_Frontend]] — stack completo, scripts npm de Android
- [[29_Specs/SPEC_05_Optimizacion_Tecnica]] — CVEs de la toolchain de Capacitor/Android ya identificados
