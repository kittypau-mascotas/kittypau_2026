package com.kittypau.app.widget

import android.content.Context
import com.kittypau.app.BuildConfig
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Autenticación del widget en background -- Knowledge/29_Specs/010-widget-android-hero,
 * research.md Decisión 4 (storage) y Decisión 6 (distinguir sin-conexión de
 * sesión-inválida). Corre fuera del WebView/JS: no puede llamar a
 * `getValidAccessToken()` de `@/lib/auth/token.ts` -- lee el refresh token
 * directo del storage nativo de `@capacitor/preferences` y lo canjea contra
 * el endpoint estándar de Supabase Auth, sin depender de la app abierta.
 *
 * ⚠️ No compilado en este entorno (research.md Decisión 0). Dos cosas a
 * verificar al compilar por primera vez:
 *  1. `PREFERENCES_STORAGE_NAME` -- nombre real del `SharedPreferences` que
 *     usa la versión instalada de `@capacitor/preferences` en Android
 *     (documentado como "CapacitorStorage" en versiones conocidas del
 *     plugin, pero no verificado contra el código fuente exacto de la
 *     versión que termine instalada -- si difiere, `readRefreshToken`
 *     devuelve null y el widget cae a `SesionInvalida` en vez de
 *     `SinConexion`, hay que corregir el nombre acá).
 *  2. `BuildConfig.SUPABASE_URL`/`SUPABASE_ANON_KEY` -- vienen de
 *     `android/app/build.gradle` (`buildConfigField`, leídos de una Gradle
 *     property `-PsupabaseUrl=...`/`gradle.properties` local, NUNCA
 *     commiteados) -- deben quedar seteados antes de compilar o el widget
 *     nunca logra autenticarse.
 */
sealed class WidgetAuthState {
    data class Authenticated(val accessToken: String) : WidgetAuthState()
    object SinConexion : WidgetAuthState() // FR-010: mantener el último dato conocido
    object SesionInvalida : WidgetAuthState() // FR-014: estado neutro "Iniciá sesión"
}

object WidgetAuthBridge {
    // ver nota (1) del comentario de arriba.
    private const val PREFERENCES_STORAGE_NAME = "CapacitorStorage"
    // Mismo nombre de key que `NATIVE_REFRESH_TOKEN_KEY` en
    // `kittypau_app/src/lib/auth/token.ts` -- no reinventarlo en los dos lenguajes.
    private const val REFRESH_TOKEN_KEY = "kp_refresh_token"

    fun resolveAccessToken(context: Context): WidgetAuthState {
        val refreshToken = readRefreshToken(context)
            ?: return WidgetAuthState.SesionInvalida // nunca hubo login nativo, o ya se limpió (logout)

        return try {
            val (code, body) = postRefresh(refreshToken)
            when {
                code in 200..299 && body != null -> {
                    val json = JSONObject(body)
                    val accessToken = json.optString("access_token", "")
                    if (accessToken.isEmpty()) return WidgetAuthState.SesionInvalida
                    // Supabase rota el refresh token en cada canje -- guardar
                    // el nuevo, si no vino ninguno seguir con el mismo.
                    saveRefreshToken(context, json.optString("refresh_token", refreshToken))
                    WidgetAuthState.Authenticated(accessToken)
                }
                // 400/401 de Supabase Auth = refresh token vencido/revocado
                // (invalid_grant) -- sesión realmente inválida, no un error transitorio.
                code in 400..499 -> WidgetAuthState.SesionInvalida
                // 5xx u otro código inesperado del lado de Supabase -- error
                // transitorio, no tocar el estado de sesión (research.md Decisión 6).
                else -> WidgetAuthState.SinConexion
            }
        } catch (_: IOException) {
            WidgetAuthState.SinConexion // timeout / sin red
        } catch (_: Exception) {
            WidgetAuthState.SinConexion
        }
    }

    private fun readRefreshToken(context: Context): String? {
        val prefs = context.getSharedPreferences(PREFERENCES_STORAGE_NAME, Context.MODE_PRIVATE)
        return prefs.getString(REFRESH_TOKEN_KEY, null)?.takeIf { it.isNotBlank() }
    }

    private fun saveRefreshToken(context: Context, refreshToken: String) {
        context.getSharedPreferences(PREFERENCES_STORAGE_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(REFRESH_TOKEN_KEY, refreshToken)
            .apply()
    }

    /** `POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token` -- endpoint estándar de Supabase Auth. */
    private fun postRefresh(refreshToken: String): Pair<Int, String?> {
        val url = URL("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token")
        val connection = url.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            connection.outputStream.use {
                it.write(JSONObject().put("refresh_token", refreshToken).toString().toByteArray())
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.use { reader -> reader.readText() }
            return code to body
        } finally {
            connection.disconnect()
        }
    }
}
