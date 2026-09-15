package com.kittypau.app

import com.capacitorjs.plugins.pushnotifications.MessagingService
import com.google.firebase.messaging.RemoteMessage
import com.kittypau.app.widget.WidgetRefreshWorker

/**
 * Subclase de la `FirebaseMessagingService` que ya trae `@capacitor/push-notifications`
 * -- Knowledge/29_Specs/010-widget-android-hero, tasks.md T022 (research.md
 * Decisión 5, mejora de latencia opcional/no bloqueante para SC-002). Un
 * solo `FirebaseMessagingService` puede estar registrado por app (FCM lo
 * exige) -- en vez de reemplazar el del plugin, esta clase lo EXTIENDE y
 * llama `super.onMessageReceived()` primero, así el comportamiento existente
 * (push "comió"/"le sirvieron", `PushNotificationsPlugin.sendRemoteMessage()`)
 * queda intacto -- solo se agrega el chequeo del data-flag nuevo.
 * `AndroidManifest.xml` reemplaza el `<service>` que trae el plugin (`tools:node="replace"`)
 * para apuntar acá en vez de a `MessagingService` directo.
 *
 * ⚠️ No compilado en este entorno (research.md Decisión 0) -- ni el push en
 * general lo está, sigue bloqueado en las credenciales de Firebase de Mauro
 * (`FIREBASE_SERVICE_ACCOUNT_JSON`/`google-services.json`,
 * `008-push-notifications-fcm/plan.md`). Este archivo no cambia ese estado,
 * solo se activa cuando el push general se active.
 */
class KittypauMessagingService : MessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        if (remoteMessage.data["kittypau_widget_refresh"] == "1") {
            WidgetRefreshWorker.enqueueImmediate(applicationContext)
        }
    }
}
