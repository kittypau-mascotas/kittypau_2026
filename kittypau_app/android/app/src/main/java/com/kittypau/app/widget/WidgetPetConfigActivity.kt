package com.kittypau.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Configuration Activity del widget -- Knowledge/29_Specs/010-widget-android-hero
 * FR-013 / Pregunta 2 del spec. Android la lanza automáticamente después de
 * bindear el widget (declarada en `android:configure` de
 * `kittypau_hero_widget_info.xml`), tanto si el bind vino del selector
 * manual del sistema como de `requestPinAppWidget()` (research.md Decisión 2
 * -- mismo mecanismo para los dos caminos, no hace falta un flujo custom).
 *
 * UI mínima con Views clásicas (sin Compose/Material3): la lista de
 * mascotas de una cuenta real es corta (1-3), no justifica traer el toolkit
 * completo de Compose UI solo para esta pantalla (ladder Ponytail) -- Glance
 * ya está en el proyecto (research.md Decisión 1) pero es para widgets, no
 * para Activities normales.
 *
 * ⚠️ No compilado en este entorno -- ver nota de KittypauHeroWidget.kt.
 */
class WidgetPetConfigActivity : Activity() {
    private var appWidgetId: Int = AppWidgetManager.INVALID_APPWIDGET_ID
    private lateinit var root: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Resultado CANCELED por default -- si el usuario se va sin elegir
        // (back, o cualquier salida temprana), el sistema descarta el bind.
        setResult(Activity.RESULT_CANCELED)

        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 64, 48, 64)
        }
        setContentView(ScrollView(this).apply { addView(root) })

        showLoading()
        loadPets()
    }

    private fun showLoading() {
        root.removeAllViews()
        root.addView(
            TextView(this).apply {
                text = "Cargando tus mascotas..."
                textSize = 16f
                gravity = Gravity.CENTER
            },
        )
        root.addView(ProgressBar(this))
    }

    private fun showMessage(message: String) {
        root.removeAllViews()
        root.addView(
            TextView(this).apply {
                text = message
                textSize = 15f
                setPadding(0, 32, 0, 0)
            },
        )
    }

    private fun loadPets() {
        thread {
            val auth = WidgetAuthBridge.resolveAccessToken(applicationContext)
            when (auth) {
                is WidgetAuthState.Authenticated -> fetchPets(auth.accessToken)
                else -> runOnUiThread {
                    // Sin sesión -- FR-014 no aplica todavía (el widget ni
                    // se colocó), acá simplemente no se puede configurar.
                    showMessage(
                        "Iniciá sesión en la app de Kittypau antes de agregar el widget.",
                    )
                }
            }
        }
    }

    private fun fetchPets(accessToken: String) {
        val pets = try {
            val url = URL("$API_BASE_URL/api/pets")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            val code = connection.responseCode
            if (code !in 200..299) {
                connection.disconnect()
                null
            } else {
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                connection.disconnect()
                JSONArray(body)
            }
        } catch (_: IOException) {
            null
        } catch (_: Exception) {
            null
        }

        runOnUiThread {
            if (pets == null) {
                showMessage("No se pudo cargar tus mascotas. Probá de nuevo en unos minutos.")
                return@runOnUiThread
            }
            if (pets.length() == 0) {
                showMessage("Todavía no tenés mascotas registradas en Kittypau.")
                return@runOnUiThread
            }
            showPetList(pets)
        }
    }

    private fun showPetList(pets: JSONArray) {
        root.removeAllViews()
        root.addView(
            TextView(this).apply {
                text = "¿A qué mascota vas a vincular este widget?"
                textSize = 17f
                setTypeface(typeface, Typeface.BOLD)
                setPadding(0, 0, 0, 32)
            },
        )
        for (index in 0 until pets.length()) {
            val pet = pets.optJSONObject(index) ?: continue
            val id = pet.optString("id", "")
            val name = pet.optString("name", "Mascota")
            val photoUrl = pet.optString("photo_url", null)
            if (id.isEmpty()) continue

            root.addView(
                TextView(this).apply {
                    text = name
                    textSize = 16f
                    setPadding(24, 32, 24, 32)
                    setBackgroundColor(Color.parseColor("#F1F5F9"))
                    setOnClickListener { selectPet(id, name, photoUrl) }
                },
            )
            root.addView(View(this).apply { minimumHeight = 16 })
        }
    }

    private fun selectPet(petId: String, petName: String, photoUrl: String?) {
        WidgetPrefs.savePetConfig(applicationContext, appWidgetId, petId, petName, photoUrl)
        WidgetRefreshWorker.enqueueImmediate(applicationContext)

        val resultValue = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        setResult(Activity.RESULT_OK, resultValue)
        finish()
    }

    private companion object {
        // Mismo dominio que WidgetRefreshWorker.API_BASE_URL / capacitor.config.ts.
        const val API_BASE_URL = "https://kittypau-app.vercel.app"
    }
}
