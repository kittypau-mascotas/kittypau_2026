package com.kittypau.app.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * `GlanceAppWidgetReceiver` -- Knowledge/29_Specs/010-widget-android-hero,
 * registrado en AndroidManifest.xml. Encola/cancela el refresco periódico
 * (`WidgetRefreshWorker`, research.md Decisión 5) según haya o no instancias
 * del widget en pantalla, y limpia la configuración guardada cuando se quita
 * una instancia (data-model.md §1, Edge Case "quitar y volver a agregar").
 *
 * ⚠️ No compilado en este entorno -- ver nota de KittypauHeroWidget.kt.
 */
class KittypauHeroWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = KittypauHeroWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        // Primera instancia del widget en pantalla -- arranca el refresco
        // periódico (piso real 15 min, research.md Decisión 5).
        WidgetRefreshWorker.enqueuePeriodic(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        // Se quitó la última instancia -- no tiene sentido seguir gastando
        // batería refrescando algo que no se ve.
        WidgetRefreshWorker.cancelPeriodic(context)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        for (appWidgetId in appWidgetIds) {
            WidgetPrefs.clear(context, appWidgetId)
            petPhotoCacheFile(context, appWidgetId).delete()
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        // Cualquier instancia nueva/actualizada dispara un refresco inmediato
        // -- no esperar hasta el próximo ciclo periódico para el primer dato.
        WidgetRefreshWorker.enqueueImmediate(context)
    }
}
