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

### A2 — Desalineación de versiones Capacitor: CLI en 7.6.0, core/android en 8.2.0

```json
"@capacitor/cli": "^7.6.0",       // ⚠️ un major atrás
"@capacitor/core": "^8.2.0",
"@capacitor/android": "^8.2.0",
```

El CLI genera/sincroniza el proyecto nativo — con un major de diferencia, comandos como
`cap sync`/`cap doctor` pueden dar resultados inconsistentes con lo que el runtime v8
realmente necesita (Gradle 8.14.3, AGP 8.13.0, Kotlin 2.2, sintaxis `compileSdk = 36` en vez
de `compileSdk 36`). Actualizar el CLI a `^8.x` es el primer paso antes de tocar A1.

**Esfuerzo:** XS. **Impacto:** Medio — previene fricción/errores confusos en el resto de
esta lista.

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
| 1 | A2 — alinear `@capacitor/cli` a v8 | XS | Medio | Antes de tocar A1 |
| 2 | A1 — `targetSdk`/`compileSdk` 36 + System Bars (edge-to-edge) | M | Alto | **Antes del 31/08/2026** |
| 3 | `@capacitor/app` — predictive back + deep links | S | Medio | Ligada a A1 (mismo cambio de comportamiento de Android 16) |
| 4 | `@capacitor/haptics` | XS | Bajo/medio | Cuando haya ancho |
| 5 | `@capacitor/preferences`, `@capacitor/share`, biometría | S-M c/u | Medio | Sin apuro, evaluar una por una |

---

## Ver también

- [[05_API/SPEC_HungerBar_Alertas]] §6.1 — el caso real que expuso la brecha JS-deploy vs APK nativo
- [[04_Frontend/README_Frontend]] — stack completo, scripts npm de Android
- [[29_Specs/SPEC_05_Optimizacion_Tecnica]] — CVEs de la toolchain de Capacitor/Android ya identificados
