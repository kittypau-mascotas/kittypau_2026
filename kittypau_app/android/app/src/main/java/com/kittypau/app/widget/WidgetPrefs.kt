package com.kittypau.app.widget

import android.content.Context
import android.content.SharedPreferences

/**
 * Persistencia local por `appWidgetId` -- data-model.md §1 (qué mascota
 * muestra cada instancia) y §5 (último snapshot conocido, FR-010).
 * `SharedPreferences` estándar, sin base de datos local -- mismo patrón
 * recomendado por la guía oficial de `AppWidgetProvider` para configuration
 * Activities. Sin dependencia de `androidx.core-ktx` (ladder Ponytail): el
 * `Editor` estándar del SDK alcanza para esto.
 */
object WidgetPrefs {
    private const val PREFS_NAME = "kittypau_widget_prefs"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun savePetConfig(
        context: Context,
        appWidgetId: Int,
        petId: String,
        petName: String?,
        petPhotoUrl: String?,
    ) {
        prefs(context).edit()
            .putString(petIdKey(appWidgetId), petId)
            .putString(petNameKey(appWidgetId), petName)
            .putString(petPhotoUrlKey(appWidgetId), petPhotoUrl)
            .apply()
    }

    fun petId(context: Context, appWidgetId: Int): String? =
        prefs(context).getString(petIdKey(appWidgetId), null)

    fun petName(context: Context, appWidgetId: Int): String? =
        prefs(context).getString(petNameKey(appWidgetId), null)

    fun petPhotoUrl(context: Context, appWidgetId: Int): String? =
        prefs(context).getString(petPhotoUrlKey(appWidgetId), null)

    fun saveSnapshot(context: Context, appWidgetId: Int, snapshot: WidgetSnapshot) {
        prefs(context).edit().putString(snapshotKey(appWidgetId), snapshot.toJson()).apply()
    }

    fun snapshot(context: Context, appWidgetId: Int): WidgetSnapshot? =
        prefs(context).getString(snapshotKey(appWidgetId), null)?.let(WidgetSnapshot::fromJson)

    /** Sesión inválida (FR-014) vs. offline momentáneo (FR-010) -- research.md Decisión 6. */
    fun saveSessionValid(context: Context, appWidgetId: Int, valid: Boolean) {
        prefs(context).edit().putBoolean(sessionValidKey(appWidgetId), valid).apply()
    }

    fun isSessionValid(context: Context, appWidgetId: Int): Boolean =
        prefs(context).getBoolean(sessionValidKey(appWidgetId), true)

    /** Edge Case del spec: quitar el widget y volver a agregarlo es una configuración nueva. */
    fun clear(context: Context, appWidgetId: Int) {
        prefs(context).edit()
            .remove(petIdKey(appWidgetId))
            .remove(petNameKey(appWidgetId))
            .remove(petPhotoUrlKey(appWidgetId))
            .remove(snapshotKey(appWidgetId))
            .remove(sessionValidKey(appWidgetId))
            .apply()
    }

    private fun petIdKey(id: Int) = "pet_id_$id"
    private fun petNameKey(id: Int) = "pet_name_$id"
    private fun petPhotoUrlKey(id: Int) = "pet_photo_url_$id"
    private fun snapshotKey(id: Int) = "snapshot_$id"
    private fun sessionValidKey(id: Int) = "session_valid_$id"
}
