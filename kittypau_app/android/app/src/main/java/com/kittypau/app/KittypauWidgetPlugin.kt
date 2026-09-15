package com.kittypau.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.kittypau.app.widget.KittypauHeroWidgetReceiver

/**
 * Plugin Capacitor propio -- Knowledge/29_Specs/010-widget-android-hero,
 * contracts/widget-pin-plugin.md y research.md Decisión 2. Expone un único
 * método a JS/TS (`@/lib/native/kittypau-widget-plugin.ts`,
 * `useAddWidgetToHomeScreen.ts`) que dispara
 * `AppWidgetManager.requestPinAppWidget()` desde el botón "Agregar widget"
 * de `/settings` -- el objetivo explícito de Mauro de que agregar el widget
 * sea un flujo de un tap dentro de la app, no solo el selector manual del
 * sistema.
 *
 * ⚠️ No compilado en este entorno -- ver nota de KittypauHeroWidget.kt.
 */
@CapacitorPlugin(name = "KittypauWidget")
class KittypauWidgetPlugin : Plugin() {
    @PluginMethod
    fun requestPin(call: PluginCall) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val provider = ComponentName(context, KittypauHeroWidgetReceiver::class.java)

        // isRequestPinAppWidgetSupported() es API 26+ y depende también del
        // launcher del usuario -- chequear antes de llamar
        // requestPinAppWidget() evita una excepción nativa si no hay soporte
        // (contracts/widget-pin-plugin.md).
        val supported = appWidgetManager.isRequestPinAppWidgetSupported
        if (supported) {
            // `extras`/`successCallback` en null: la configuración de la
            // mascota la resuelve `WidgetPetConfigActivity`, que Android
            // lanza automático después del bind (research.md Decisión 2) --
            // no hace falta pasarle nada acá.
            appWidgetManager.requestPinAppWidget(provider, null, null)
        }

        val result = JSObject()
        result.put("supported", supported)
        call.resolve(result)
    }
}
