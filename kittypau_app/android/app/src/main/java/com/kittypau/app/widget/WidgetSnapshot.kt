package com.kittypau.app.widget

import org.json.JSONObject

/**
 * Espejo Kotlin del payload de `GET /api/pets/:id/hunger-bar` (extendido con
 * `water`, ver Knowledge/29_Specs/010-widget-android-hero/contracts/hunger-bar-water-extension.md
 * y data-model.md §2/§3) -- solo los campos que el widget realmente pinta.
 * `org.json.JSONObject` (SDK de Android, sin dependencia nueva) para
 * (de)serializar hacia `WidgetPrefs` (data-model.md §5, caché del último dato
 * conocido para el estado offline de FR-010).
 */
data class WidgetSnapshot(
    val hasFoodDevice: Boolean,
    val foodPercentage: Int?,
    val mealsToday: Int?,
    val lastMealDetectedAt: String?,
    val hasWaterDevice: Boolean,
    val waterPercentage: Int?,
    val waterHasEvidence: Boolean,
    val lastWaterEventAt: String?,
    val fetchedAtMillis: Long,
) {
    fun toJson(): String =
        JSONObject()
            .put("hasFoodDevice", hasFoodDevice)
            .put("foodPercentage", foodPercentage ?: JSONObject.NULL)
            .put("mealsToday", mealsToday ?: JSONObject.NULL)
            .put("lastMealDetectedAt", lastMealDetectedAt ?: JSONObject.NULL)
            .put("hasWaterDevice", hasWaterDevice)
            .put("waterPercentage", waterPercentage ?: JSONObject.NULL)
            .put("waterHasEvidence", waterHasEvidence)
            .put("lastWaterEventAt", lastWaterEventAt ?: JSONObject.NULL)
            .put("fetchedAtMillis", fetchedAtMillis)
            .toString()

    companion object {
        fun fromJson(raw: String): WidgetSnapshot? {
            return try {
                val obj = JSONObject(raw)
                WidgetSnapshot(
                    hasFoodDevice = obj.optBoolean("hasFoodDevice", false),
                    foodPercentage = obj.optIntOrNull("foodPercentage"),
                    mealsToday = obj.optIntOrNull("mealsToday"),
                    lastMealDetectedAt = obj.optStringOrNull("lastMealDetectedAt"),
                    hasWaterDevice = obj.optBoolean("hasWaterDevice", false),
                    waterPercentage = obj.optIntOrNull("waterPercentage"),
                    waterHasEvidence = obj.optBoolean("waterHasEvidence", false),
                    lastWaterEventAt = obj.optStringOrNull("lastWaterEventAt"),
                    fetchedAtMillis = obj.optLong("fetchedAtMillis", 0L),
                )
            } catch (_: Exception) {
                null
            }
        }

        /**
         * Parsea la respuesta cruda de `GET /api/pets/:id/hunger-bar` tal
         * cual la devuelve la API (contracts/hunger-bar-water-extension.md)
         * -- FR-015: nunca inventa un valor, si un campo no vino queda `null`.
         */
        fun fromApiResponse(body: JSONObject): WidgetSnapshot {
            val hasFood = body.optString("status") == "ok"
            val water = body.optJSONObject("water")
            val hasWater = water != null && water.optString("status") == "ok"
            return WidgetSnapshot(
                hasFoodDevice = hasFood,
                foodPercentage = if (hasFood) body.optIntOrNull("percentage") else null,
                mealsToday = body.optJSONObject("kpis")?.optIntOrNull("mealsToday"),
                lastMealDetectedAt = if (hasFood) body.optStringOrNull("lastMealDetectedAt") else null,
                hasWaterDevice = hasWater,
                waterPercentage = if (hasWater) water?.optIntOrNull("percentage") else null,
                waterHasEvidence = water?.optBoolean("hasEvidence", false) ?: false,
                lastWaterEventAt = if (hasWater) water?.optStringOrNull("lastEventAt") else null,
                fetchedAtMillis = System.currentTimeMillis(),
            )
        }
    }
}

private fun JSONObject.optIntOrNull(name: String): Int? =
    if (has(name) && !isNull(name)) optInt(name) else null

private fun JSONObject.optStringOrNull(name: String): String? =
    if (has(name) && !isNull(name)) optString(name) else null
