package com.kittypau.app.widget

import android.content.Context
import android.graphics.BitmapFactory
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * Refresco en background del widget -- Knowledge/29_Specs/010-widget-android-hero,
 * User Story 2, research.md Decisión 5. Por cada instancia configurada
 * (`WidgetPrefs`): resuelve el access token (`WidgetAuthBridge`), pega a
 * `GET /api/pets/:id/hunger-bar` (ya extendido con `water`, ver
 * contracts/hunger-bar-water-extension.md), cachea el snapshot (FR-010) y
 * descarga la foto de la mascota si cambió. Piso real de WorkManager: 15 min
 * para el periódico -- cumple SC-002 (ventana de 30 min) solo con esto; el
 * trigger inmediato por push (research.md Decisión 5, mejora de latencia) es
 * una tarea aparte (tasks.md T022), no bloqueante.
 *
 * ⚠️ No compilado en este entorno -- ver nota de KittypauHeroWidget.kt y
 * WidgetAuthBridge.kt.
 */
class WidgetRefreshWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val manager = GlanceAppWidgetManager(applicationContext)
        val glanceIds = manager.getGlanceIds(KittypauHeroWidget::class.java)
        for (glanceId in glanceIds) {
            val appWidgetId = manager.getAppWidgetId(glanceId)
            refreshOne(appWidgetId)
        }
        // Repinta con lo que haya quedado en WidgetPrefs (dato nuevo, último
        // conocido si hubo SinConexion, o estado neutro si SesionInvalida).
        KittypauHeroWidget().updateAll(applicationContext)
        Result.success()
    }

    private fun refreshOne(appWidgetId: Int) {
        val petId = WidgetPrefs.petId(applicationContext, appWidgetId) ?: return

        when (val auth = WidgetAuthBridge.resolveAccessToken(applicationContext)) {
            is WidgetAuthState.SesionInvalida -> {
                // FR-014: limpiar el dato mostrado, no dejar algo que ya no
                // se puede verificar. La configuración (petId) se mantiene --
                // si el dueño vuelve a iniciar sesión, no hace falta
                // reconfigurar el widget desde cero.
                WidgetPrefs.saveSessionValid(applicationContext, appWidgetId, false)
            }
            WidgetAuthState.SinConexion -> {
                // FR-010: no tocar nada, seguir mostrando el último snapshot cacheado.
            }
            is WidgetAuthState.Authenticated -> {
                WidgetPrefs.saveSessionValid(applicationContext, appWidgetId, true)
                fetchAndCacheSnapshot(appWidgetId, petId, auth.accessToken)
            }
        }
    }

    private fun fetchAndCacheSnapshot(appWidgetId: Int, petId: String, accessToken: String) {
        val url = URL("$API_BASE_URL/api/pets/$petId/hunger-bar")
        val connection = url.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            val code = connection.responseCode
            if (code !in 200..299) return // error transitorio -- FR-010, se queda con el último dato

            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val snapshot = WidgetSnapshot.fromApiResponse(JSONObject(body))
            WidgetPrefs.saveSnapshot(applicationContext, appWidgetId, snapshot)

            val photoUrl = WidgetPrefs.petPhotoUrl(applicationContext, appWidgetId)
            if (!photoUrl.isNullOrBlank()) downloadPetPhoto(appWidgetId, photoUrl)
        } catch (_: IOException) {
            // sin conexión en este pedido puntual -- se queda con el último dato (FR-010).
        } catch (_: Exception) {
            // respuesta inesperada -- mismo criterio, no tocar el snapshot cacheado.
        } finally {
            connection.disconnect()
        }
    }

    private fun downloadPetPhoto(appWidgetId: Int, photoUrl: String) {
        try {
            val connection = URL(photoUrl).openConnection() as HttpURLConnection
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.inputStream.use { input ->
                val bitmap = BitmapFactory.decodeStream(input) ?: return
                val file = petPhotoCacheFile(applicationContext, appWidgetId)
                file.parentFile?.mkdirs()
                file.outputStream().use { out ->
                    bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 85, out)
                }
            }
            connection.disconnect()
        } catch (_: Exception) {
            // Sin foto nueva -- FR-002 ya cubre el fallback si nunca hubo caché.
        }
    }

    companion object {
        // Mismo dominio que `capacitor.config.ts` (`appServerUrl`, default de
        // `CAPACITOR_SERVER_URL`) -- si ese default cambia, actualizar acá también.
        private const val API_BASE_URL = "https://kittypau-app.vercel.app"
        private const val PERIODIC_WORK_NAME = "kittypau_widget_refresh_periodic"
        private const val IMMEDIATE_WORK_NAME = "kittypau_widget_refresh_immediate"

        /** Piso real de Android para trabajo periódico: 15 min (research.md Decisión 5). */
        fun enqueuePeriodic(context: Context) {
            val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(15, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        fun cancelPeriodic(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_WORK_NAME)
        }

        /** Primer refresco tras agregar/actualizar una instancia, o trigger por push (T022). */
        fun enqueueImmediate(context: Context) {
            val request = OneTimeWorkRequestBuilder<WidgetRefreshWorker>().build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                IMMEDIATE_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request,
            )
        }
    }
}
