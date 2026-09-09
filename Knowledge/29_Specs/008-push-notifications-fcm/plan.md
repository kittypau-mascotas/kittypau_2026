# 008 — Push notifications reales (FCM) para "comió" / "le sirvieron"

> ⚠️ **Incidente real (2026-09-09, mismo día del build inicial): crasheaba la app en
> producción.** Mauro instaló el APK, la app abría bien pero se cerraba sola ("me tira para
> afuera"). Log real del celular:
> ```
> Caused by: java.lang.IllegalStateException: Default FirebaseApp is not initialized in this
> process com.kittypau.app. Make sure to call FirebaseApp.initializeApp(Context) first.
>   at com.google.firebase.FirebaseApp.getInstance(FirebaseApp.java:179)
>   at com.google.firebase.messaging.FirebaseMessaging.getInstance(FirebaseMessaging.java:120)
>   at com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin.register(...)
> ```
> `PushNotifications.register()` llama a `FirebaseMessaging.getInstance()`, que revienta sin
> `google-services.json` -- pasa en un hilo nativo, **no lo captura el `try/catch` de JS**, mata
> el proceso entero. El `try/catch` de `usePushTokenRegistration.ts` asumía (mal) que cualquier
> falla del plugin sería un rechazo de promesa capturable -- una excepción nativa no vuelve por
> ese camino.
>
> **Fix (mismo día):** kill-switch `NEXT_PUBLIC_PUSH_NOTIFICATIONS_ENABLED` (default `"false"`,
> ver `.env.example`) -- mientras no sea literalmente `"true"`, el hook nunca llama a
> `PushNotifications.register()` ni pide permisos. Como es JS puro, el fix se desplegó sin
> recompilar el APK -- la app ya instalada lo toma en el próximo reload desde `server.url`. Solo
> se debe poner en `"true"` (en Vercel) el mismo día que se recompile el APK con
> `google-services.json` real adentro -- las dos cosas van juntas, nunca una sin la otra.

## Contexto

`useHungerBarEventNotifications` (`kittypau_app/src/lib/hooks/useHungerBarEventNotifications.ts`)
ya manda un `LocalNotification` cuando el motor de `Investigacion_v2` confirma un evento nuevo
de alimentación o servido — pero **solo funciona con `/today` abierta**: es un poll client-side
cada 5 minutos (`today/page.tsx`), no push real. Con la app cerrada o en background, no hay
ningún proceso corriendo que detecte el evento.

Pedido de Mauro (2026-09-09): que el aviso llegue igual con la app cerrada. Confirmado con él
que el APK es **solo de prueba, sideload directo, no se publica en Play Store** — eso saca de
la ecuación cualquier paso de revisión/publicación de tienda, el único costo real es
infraestructura (Firebase + cron).

## Qué se construyó (2026-09-09), sin depender de credenciales

Todo lo que no necesita el proyecto Firebase real está hecho y verificado (`tsc`/`vitest`
68/68/`next build` limpios):

| Pieza | Archivo | Qué hace |
|---|---|---|
| Tabla de tokens | `supabase/migrations/20260909185538_add_push_notifications.sql` | `push_tokens` (user_id, token, platform) + `push_notified_meal_events` (dedupe) con RLS |
| Registro de token (server) | `src/app/api/push/register-token/route.ts` | `POST`/`DELETE` autenticado, upsert por `(user_id, token)` |
| Registro de token (cliente) | `src/lib/hooks/usePushTokenRegistration.ts` | Pide permiso + registra vía `@capacitor/push-notifications`, solo nativo, wireado en `today/page.tsx` |
| Envío FCM | `src/lib/push/fcm.ts` | `sendPushToTokens()` via `firebase-admin`, credenciales desde `FIREBASE_SERVICE_ACCOUNT_JSON` |
| Cron de detección | `src/app/api/cron/notify-meal-events/route.ts` | Recorre todos los pets con comedero activo, reusa `computeHungerBar`, dedupea contra `push_notified_meal_events`, manda push |
| Refactor de soporte | `src/lib/hunger-bar-server.ts` | `resolveFoodDevice()` + `fetchHungerBarForDevice()` extraídos de `hunger-bar/route.ts` para reusar en el cron sin duplicar paginación — mismo comportamiento exacto, cero cambio de lógica |
| Android nativo | `npx cap sync android` corrido | Plugin `@capacitor/push-notifications` registrado en gradle. El plugin `com.google.gms.google-services` **ya estaba condicionalmente armado** en `android/app/build.gradle:65-70` (aplica solo si existe `google-services.json` — Capacitor lo genera así por defecto) |

**Decisión de diseño — por qué NO Vercel Cron:** el free tier de Vercel Cron corre come mucho
1 vez al día, insuficiente para "avisar en minutos". El endpoint del cron se protege con
`CRON_SECRET` (mismo patrón que `bridge/health-check`, header `Authorization: Bearer`), pensado
para ser llamado por **Supabase `pg_cron` + `pg_net`** (gratis, frecuencia configurable) en vez
de un cron nativo de Vercel. Alternativa igual de válida si se prefiere: un cron externo gratis
(GitHub Actions scheduled workflow, cron-job.org) pegándole al mismo endpoint con el mismo header.

## Qué falta — 100% bloqueado en credenciales de Mauro, no en código

1. **Crear el proyecto Firebase** (gratis): https://console.firebase.google.com → "Agregar
   proyecto".
2. **Agregar app Android** al proyecto con el package name `com.kittypau.app`
   (`capacitor.config.ts:25`) → descarga `google-services.json` → colocarlo en
   `kittypau_app/android/app/google-services.json` (nunca commitear si el repo es público;
   este repo es privado, pero igual queda fuera del `git add` automático hasta que Mauro
   confirme).
3. **Generar clave de cuenta de servicio**: dentro del proyecto → ⚙️ Configuración →
   "Cuentas de servicio" → "Generar nueva clave privada" → el JSON completo va en la variable
   de entorno `FIREBASE_SERVICE_ACCOUNT_JSON` (Vercel + `.env.local`), nunca en el repo.
4. **Programar el cron**: en el SQL editor de Supabase (no commiteado, tiene el secret adentro),
   algo como:
   ```sql
   select cron.schedule(
     'notify-meal-events',
     '*/5 * * * *',
     $$
     select net.http_post(
       url := 'https://kittypau-app.vercel.app/api/cron/notify-meal-events',
       headers := jsonb_build_object('Authorization', 'Bearer EL_CRON_SECRET_REAL')
     );
     $$
   );
   ```
   Requiere las extensiones `pg_cron` y `pg_net` habilitadas (Database → Extensions en el
   dashboard de Supabase).
5. **Rebuild del APK**: `npm run build && npx cap sync android` (ya corrido, solo falta el
   `google-services.json` real) + compilar e instalar en el celular como ya se hace hoy.

Ninguno de estos 5 pasos es código pendiente — son credenciales/configuración que solo Mauro
puede proveer. El código ya está escrito para que, apenas exista `FIREBASE_SERVICE_ACCOUNT_JSON`
y `google-services.json`, funcione sin tocar nada más.

## Foto de la mascota en el push (2026-09-09)

Pedido de Mauro tras la lista de mejoras de notificaciones: usar la foto real de la mascota
(`pets.photo_url`, URL pública de Supabase Storage) en vez del logo genérico de Kittypau.

Investigado antes de tocar código (para no repetir el error del ícono transparente):
`@capacitor/local-notifications`'s `largeIcon` **solo acepta un drawable empaquetado en el
APK** (string = nombre de recurso, ver `node_modules/@capacitor/local-notifications/dist/esm/
definitions.d.ts:568-578`) -- no puede ser una URL ni una foto dinámica, límite de la
plataforma. `AndroidNotification.imageUrl` de `firebase-admin` (`messaging-api.d.ts:459`) sí
es una URL real que FCM baja solo.

**Decisión (con Mauro, opción "solo FCM"):** `pet.photo_url` viaja como `imageUrl` en
`sendPushToTokens()` (`lib/push/fcm.ts`) -- se ve como imagen grande al expandir el push que
llega con la app cerrada. Las `LocalNotifications` (`useHungerBarEventNotifications`, con la
app abierta) siguen con `ic_notification_kittypau` fijo, sin tocar.

> ⚠️ **Investigado más a fondo (2026-09-09, mismo día):** Mauro pidió explícitamente la foto
> dinámica también en la notificación local ("con la app abierta"). Se intentó construir con
> `@capacitor/filesystem` (bajar `photo_url` a un archivo + `attachments`) -- **revertido antes
> de commitear** al leer el código Java real del plugin:
> - `LocalNotificationManager.java:218` + `LocalNotification.java:347-354` (`getLargeIcon`) --
>   `largeIcon` SIEMPRE resuelve el string como nombre de recurso `drawable` vía
>   `context.getResources().getIdentifier(...)` (`AssetUtil.java:341-343`), sin ningún fallback
>   a URI o archivo. Pasar un `file://` ahí no funciona, puede devolver `null`/fallar.
> - `attachments` se parsea (`LocalNotificationAttachment.java`) pero **`LocalNotificationManager.java`
>   nunca lo lee** -- cero referencias a `getAttachments()` en todo el manager de Android. Es
>   una función que solo existe para iOS en este plugin (`AttachmentOptions` de
>   `definitions.d.ts` ya lo insinuaba: todas sus opciones dicen "Only available for iOS", pero
>   el campo base tampoco hace nada en Android).
>
> **Conclusión: no hay ninguna combinación de campos de `@capacitor/local-notifications` que
> muestre una imagen dinámica en Android.** No es "más trabajo", es que el plugin no lo
> soporta -- la única forma real sería parchear/extender el plugin nativo (Java), fuera de
> alcance. `@capacitor/filesystem` se instaló y desinstaló en la misma sesión al confirmar
> esto. La foto real de la mascota queda exclusivamente en el camino FCM (que si funciona,
> porque ahí Firebase resuelve `imageUrl` del lado nativo), pendiente de las credenciales.

Igual que el resto de este spec: bloqueado en que exista `FIREBASE_SERVICE_ACCOUNT_JSON` para
poder probarse en un dispositivo real.

## Qué se dejó fuera a propósito (ponytail)

- **Sin retry/backoff en el envío FCM** — si un push falla, se loguea y sigue con los demás;
  el próximo tick del cron (5-10 min después) ya cubre el caso transitorio.
- **Sin borrar el token al hacer logout** — el token queda en `push_tokens` hasta que FCM lo
  reporte inválido (reinstalación, etc.) o se borre a mano. Bajo impacto con 1-2 usuarios de
  prueba; agregar `DELETE /api/push/register-token` al flujo de logout si esto crece.
- **Cron recorre pets secuencial, uno por uno** — simple y suficiente para uso personal/de
  prueba. Paralelizar es el upgrade obvio si esto corre para muchos usuarios reales.
