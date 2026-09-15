# Research: Widget de Android — mini-hero de la mascota

**Input**: [spec.md](spec.md) | **Fecha**: 2026-09-15

Objetivo explícito de Mauro que este research debe dejar resuelto: *"mi objetivo es que en mi
apk, tenga una opcion para descargar o vincular un widget de mi app en el celu de la persona"*
— no alcanza con que el widget exista en el selector manual del sistema operativo, tiene que
haber un botón dentro de la APK que dispare el alta. Ver Decisión 2.

---

## Decisión 0: Herramientas de build realmente disponibles en este entorno

**Decisión**: Este entorno de Claude Code (VSCode extension, Windows) **no puede compilar ni
correr** el proyecto Android. `java`/`javac` no están en el `PATH` (`java: command not found`),
`JAVA_HOME`/`ANDROID_HOME`/`ANDROID_SDK_ROOT` no están seteados. `kittypau_app/android/gradlew`
y `gradlew.bat` existen, y hay caché de un build previo en `android/.gradle/8.14.5/` y
`android/app/build/` — evidencia de que el proyecto SÍ se compiló alguna vez en la PC de Mauro
(o en una sesión con JDK/SDK instalados), pero no en esta sesión.

**Rationale**: confirmado con comandos directos (`which java`, `java -version`, chequeo de
variables de entorno) antes de asumir nada — evita perder tiempo en la fase de implementación
intentando `./gradlew assembleDebug` y descubrir el problema recién ahí.

**Implicancia para `/speckit-tasks` e implementación**: el trabajo de Kotlin/XML se puede
escribir y revisar por lectura (sintaxis, imports, estructura), pero la compilación real,
`cap sync android`, y la verificación en dispositivo/emulador quedan pendientes para la PC de
Mauro — mismo patrón ya documentado para el resto de la APK en
`Knowledge/19_DevOps/PENDIENTES_POR_PC.md` (verificación visual de `/today` en APK también
está pendiente ahí por el mismo motivo). Se debe dejar esto explícito en `PENDIENTES_POR_PC.md`
al cerrar esta feature, no asumido en silencio.

**Alternativas consideradas**: instalar JDK/Android SDK en este entorno — descartado, fuera de
alcance de esta tarea y el entorno puede no persistir esas instalaciones entre sesiones; más
simple documentar el gap y dejar la verificación real donde ya se sabe que funciona.

---

## Decisión 1: RemoteViews clásico vs. Jetpack Glance

**Decisión**: **Jetpack Glance** (`androidx.glance:glance-appwidget`).

**Rationale**: aplicando el ladder de Ponytail explícitamente:
- Paso 5 ("¿lo resuelve una dependencia ya instalada?") — no, ninguna de las dos opciones está
  instalada hoy (no hay ningún widget nativo en el proyecto todavía, es superficie 100% nueva).
  Con el paso 5 en empate, decide el paso 6/7: cuál produce el **diff más corto que funciona**.
- RemoteViews clásico exige: un XML de layout por estado (normal / sin dispositivo / sesión
  inválida — ver FR-006, FR-014, Edge Cases), manejo manual de `AppWidgetProvider.onUpdate()`
  actualizando cada `TextView`/`ProgressBar`/`ImageView` por `id`, y una barra de progreso
  circular con ícono-detrás-de-número (comida) que `ProgressBar` nativo no soporta directo —
  requeriría además generar bitmaps a mano (`Canvas`+`Paint`) para los dos círculos. Es MÁS
  código, no menos, para este layout específico.
- Glance es Compose-based (API estable desde 2023, `1.1.x` en 2026), permite expresar los
  cuatro estados del widget (normal / sin dispositivo / offline-con-último-dato / sesión
  inválida — FR-010/FR-014/Edge Cases) como funciones `@Composable` condicionales en un solo
  archivo Kotlin, y `Box`+`Image` con clip circular resuelve los círculos de comida/agua sin
  generar bitmaps a mano. Glance compila internamente a `RemoteViews` — no es una superficie
  nueva de runtime, es azúcar sintáctica sobre lo mismo que ya corre en cualquier launcher.
- Para un equipo de 2 personas, menos boilerplate XML y menos actualización manual de vistas
  por `id` es directamente menos superficie de bugs a mantener a futuro — el costo real de
  Glance es una única dependencia nueva bien acotada (`glance-appwidget`), no una arquitectura
  nueva.

**Alternativas consideradas**:
- *RemoteViews clásico*: descartado por lo anterior — produce más código, no menos, para este
  layout con dos círculos con ícono+número superpuestos.
- *WebView dentro del widget*: no es una opción real — `RemoteViews`/Glance no permiten un
  `WebView` embebido en absoluto (confirmado ya en `SPEC_06_Mobile_APK_2026.md` y en el `spec.md`
  de este feature, Contexto).

---

## Decisión 2: Botón dentro de la app para agregar el widget (objetivo explícito de Mauro)

**Decisión**: `AppWidgetManager.requestPinAppWidget()` (API 26+), invocado desde un botón nuevo
al final del feed de `/today` ("Agregar widget a tu pantalla de inicio" o similar) -- reubicado ahí a pedido de Mauro, no en Ajustes, a través de un pequeño
plugin nativo de Capacitor propio (no hay plugin comunitario mantenido para esto en el
ecosistema Capacitor 8) que expone un único método `requestPin()` a JS/TS — mismo patrón ya
usado por `usePushTokenRegistration.ts` (`kittypau_app/src/lib/hooks/usePushTokenRegistration.ts`):
import dinámico de `@capacitor/core`, chequeo `Capacitor.isNativePlatform()`, no-op en web.

**Rationale**: esto es exactamente lo que Mauro pidió — *"una opcion para descargar o vincular
un widget... en el celu"* sin que la persona tenga que ir manualmente al selector de widgets
del sistema (mantener apretado → Widgets → buscar Kittypau). `requestPinAppWidget()` es la API
nativa de Android diseñada exactamente para este caso de uso desde 2017 (API 26 = Android 8.0):
un solo tap desde dentro de la app dispara el diálogo nativo de "¿Agregar este widget a tu
pantalla de inicio?", sin salir de la app y sin que el usuario navegue el selector manual.
`AppWidgetManager.isRequestPinAppWidgetSupported()` confirma en runtime si el launcher del
usuario lo soporta (la gran mayoría de launchers modernos sí — Pixel Launcher, One UI, MIUI).

**Hallazgo importante (resuelve una duda que traía el pedido de este research)**: Android
lanza automáticamente la *configuration Activity* del widget (la que declara
`android:configure` en su `AppWidgetProviderInfo`) inmediatamente después de que el widget
queda bindeado — **tanto si el bind ocurrió por `requestPinAppWidget()` como si ocurrió por el
selector manual del sistema**. Es el mismo mecanismo para los dos caminos, documentado en la
guía oficial de `AppWidgetManager`. Esto significa que **no hace falta un flujo de 2 pasos
separados** (elegir mascota en la app → recién ahí pedir el pin) — alcanza con:
1. El botón al final de `/today` llama `requestPin()` (nuestro plugin nativo).
2. El plugin invoca `AppWidgetManager.requestPinAppWidget(provider, null, successCallback)`.
3. Si el launcher soporta el flujo, Android bindea el widget y lanza automáticamente
   `WidgetPetConfigActivity` (nuestra configuration Activity, declarada en el
   `AppWidgetProviderInfo` vía `android:configure`), que muestra la lista de mascotas
   (`GET /api/pets`, ya existente) para que el dueño elija — resuelve FR-013 con el mecanismo
   estándar de Android, sin inventar un flujo custom.
4. Si el launcher NO soporta `requestPinAppWidget` (`isRequestPinAppWidgetSupported()` devuelve
   `false` — versiones/launchers viejos, o API 24-25 donde el método ni existe), el botón cae a
   un mensaje instructivo ("Mantené presionada la pantalla de inicio → Widgets → Kittypau") en
   vez de romperse — fallback automático, no una feature separada a construir.

**Alternativas consideradas**:
- *Solo depender del selector manual del sistema* (sin botón in-app): es lo que ya existía
  implícitamente por tener el widget registrado — explícitamente rechazado por Mauro ahora
  ("no alcanza con que exista"), es la motivación de este research.
- *Flujo custom de 2 pasos* (Activity propia para elegir mascota antes de pedir el pin, pasando
  el `petId` por `Intent` extras hacia el pin request): descartado tras confirmar que Android ya
  resuelve esto con el mecanismo estándar de configuration Activity — construirlo a mano sería
  reinventar algo que la plataforma ya cubre (ladder Ponytail paso 4).

---

## Decisión 3: Exponer el % de agua para que el widget nativo lo pueda pedir

**Decisión**: extender `GET /api/pets/:id/hunger-bar` (no crear un endpoint nuevo) con un
objeto `water` en la respuesta: `{ percentage, hasEvidence, lastEventLabel, lastEventAt }`.
El cálculo se extrae de `today-screen.tsx` (líneas ~1605-2580,
`waterContentWeightGrams`/`waterMaxServedContentMl`/`waterFilledBlocks`/`waterWellness`) hacia
`src/lib/hunger-bar-server.ts` (el mismo módulo ya compartido entre la ruta HTTP y el cron de
push de `008-push-notifications-fcm`), como una función hermana de `resolveFoodDevice()` /
`buildHungerBarPayload()` — ej. `resolveWaterDevice()` + inclusión en el mismo payload.

**Rationale**: el widget nativo no tiene el JS del cliente — no puede correr el cálculo que
hoy vive únicamente en `today-screen.tsx` (confirmado: es el único archivo del repo que
referencia `waterFilledBlocks`/`waterContentWeightGrams`). Las dos opciones reales eran (a)
reimplementar la fórmula en Kotlin, o (b) exponerla server-side y que tanto el widget como
cualquier futuro consumidor la pidan ya calculada. Reimplementar en Kotlin duplica una regla de
negocio real (umbral de "confirmado" vs. "sin evidencia", tope de mL servidos) en dos lenguajes
— si el umbral cambia mañana (ej. ajuste de calibración de un sensor, ver No-Negociable de
Hardware en la constitución), hay que acordarse de tocar los dos lugares. Extender el endpoint
ya existente reusa la infraestructura de auth/ownership/cache que `hunger-bar/route.ts` ya
tiene (`Cache-Control: private, max-age=30`), evita un round-trip HTTP adicional desde el
widget (batería), y es el mismo endpoint que ya prueba `hunger-bar/route.test.ts` — se le suman
casos, no se empieza de cero.

**Alternativas consideradas**:
- *Endpoint nuevo dedicado* (`GET /api/pets/:id/water-bar`): descartado — el widget ya necesita
  pegarle a `hunger-bar` para el dato de comida; separarlo en dos pedidos HTTP duplica latencia
  y auth sin necesidad real.
- *Reimplementar el cálculo en Kotlin*: descartado por el riesgo de divergencia explicado arriba.

---

## Decisión 4: Autenticación del widget en background

**Decisión**: el refresh token de Supabase se guarda con `@capacitor/preferences` (dependencia
nueva — recomendada explícitamente para este caso en `SPEC_06_Mobile_APK_2026.md` línea 111,
pero **no instalada todavía**, confirmado por `grep` en `package.json`), respaldado por
`EncryptedSharedPreferences` del lado nativo (el plugin ya usa esto internamente en Android,
no hay que implementarlo a mano). El `WidgetRefreshWorker` (Kotlin, corre en background sin el
WebView) lee el refresh token directo de esas preferences nativas y llama al endpoint estándar
de Supabase Auth (`POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`) para obtener un
access token fresco antes de pegarle a `hunger-bar`, sin depender de que la app/WebView esté
abierta ni de JavaScript.

**Rationale**: es exactamente el caso de uso para el que `@capacitor/preferences` ya estaba
recomendado en `SPEC_06` ("storage nativo key-value que sobrevive mejor a limpiezas de WebView
storage"). El refresh token, no el access token de corta duración, es lo que hay que persistir
— el worker lo cambia por un access token nuevo en cada ciclo de refresco, igual que ya hace
`getValidAccessToken()` del lado web (`@/lib/auth/token`, reusado como referencia de
comportamiento, no de código — ese vive en JS y el worker es Kotlin puro).

**Alternativas consideradas**:
- *Guardar el access token directo*: descartado — expira en minutos/horas, el widget necesita
  seguir funcionando días después de la última apertura de la app.
- *Pedirle el dato "a la app abierta"*: explícitamente descartado ya en el spec y en
  `SPEC_06` — un widget debe funcionar con la app cerrada.

---

## Decisión 5: Mecanismo de refresco en background

**Decisión**: combinar los dos mecanismos que ya evaluaba el pedido de research, no elegir uno
solo:
1. **WorkManager periódico** (`PeriodicWorkRequest`, piso real de 15 minutos — límite del
   sistema operativo, no configurable por debajo de eso) como red de seguridad — garantiza que
   el widget se pone al día aunque el push falle o el dispositivo no tenga Google Play Services
   sano.
2. **Trigger por push** (piggyback sobre `008-push-notifications-fcm`, que ya tiene
   `push_tokens`, `sendPushToTokens()` en `src/lib/push/fcm.ts`, y el cron
   `src/app/api/cron/notify-meal-events/route.ts`): el mismo evento que hoy dispara una
   notificación "comió"/"le sirvieron" dispara además un mensaje FCM **data-only** (sin UI,
   `WorkManager.enqueueUniqueWork` inmediato al recibirlo) para refrescar cualquier widget
   activo casi al instante del evento real, en vez de esperar hasta 15 minutos.

**Rationale**: el spec (`SC-002`) pide reflejar cambios dentro de 30 minutos — un
`PeriodicWorkRequest` de 15 min ya cumple esa ventana por sí solo con margen, así que el canal
de push **no es obligatorio para cumplir el Success Criterion**, pero sí mejora la experiencia
real ("en vivo") sin costo de infraestructura nuevo, porque el cron y el envío FCM ya existen y
corren para el mismo evento — es agregar un mensaje data-only más al mismo `sendPushToTokens()`
que ya se llama, no un sistema nuevo. Ladder Ponytail paso 5: la infraestructura de push ya está
instalada y pagada (Firebase del proyecto), reusarla es más barato que depender solo de polling
ciego cada 15 min (gasto de batería en todos los dispositivos, todo el tiempo, tengan o no un
evento real).

**Alternativas consideradas**:
- *Solo WorkManager, sin push*: cumple igual el SC-002 (15 min < 30 min), pero pospone el
  "en vivo" real más de lo necesario cuando la infraestructura para hacerlo mejor ya existe.
  Se documenta como fallback válido si el canal de push del widget se pospone en `/speckit-tasks`.
- *Solo push, sin WorkManager*: descartado — sin red de seguridad, un push perdido (dispositivo
  dormido, FCM caído, token vencido sin detectar) deja el widget sin refrescar indefinidamente.

---

## Decisión 6: Distinguir "sin conexión momentánea" de "sesión inválida"

**Decisión**: el código de respuesta HTTP del endpoint extendido decide, no una heurística
custom. `hunger-bar/route.ts` ya devuelve `401 AUTH_INVALID` cuando `getUserClient()` no puede
validar el request (confirmado leyendo el archivo — línea 26-28). El `WidgetRefreshWorker`:
- Si el refresh token también falla al canjearse (Supabase Auth devuelve `invalid_grant` o
  similar) → sesión realmente inválida → **FR-014**: limpiar datos, mostrar estado neutro
  "Iniciá sesión para ver a tu mascota".
- Si la llamada falla por timeout/sin red (sin respuesta HTTP en absoluto) → **FR-010**:
  mantener el último dato conocido, no tocar el estado de sesión.
- Si la API responde con cualquier otro código (500, etc.) → tratar igual que sin conexión
  (mantener último dato) — un error transitorio del backend no es lo mismo que una sesión
  inválida.

**Rationale**: reusa una distinción que el backend ya hace explícita (401 vs. cualquier otra
cosa) en vez de inventar un mecanismo de detección propio del lado del widget.

---

## Resumen de dependencias nuevas a agregar

| Dependencia | Dónde | Motivo |
|---|---|---|
| `androidx.glance:glance-appwidget` | `android/app/build.gradle` | Decisión 1 |
| `androidx.work:work-runtime-ktx` | `android/app/build.gradle` | Decisión 5 (verificar si ya viene transitivamente con Capacitor 8.5.0 antes de declararla — chequeo de `/speckit-tasks`) |
| `@capacitor/preferences` | `kittypau_app/package.json` | Decisión 4, ya recomendada en `SPEC_06` |
| Plugin Capacitor propio (`KittypauWidgetPlugin.kt`, sin dependencia externa) | `android/app/src/main/java/com/kittypau/app/` | Decisión 2 |

Ninguna reemplaza o reescribe configuración de Gradle/AGP ya resuelta (`variables.gradle`
permanece intacto: `minSdkVersion 24`, `compileSdkVersion`/`targetSdkVersion 36`) — son adds
quirúrgicos, no upgrades de plataforma.
