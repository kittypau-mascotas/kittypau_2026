package com.kittypau.app.widget

import android.content.ComponentName
import android.content.Context
import android.graphics.BitmapFactory
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.Action
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.kittypau.app.MainActivity
import com.kittypau.app.R

/**
 * Composable Glance del widget "mini-hero" -- Knowledge/29_Specs/010-widget-android-hero,
 * spec.md User Story 1 + FR-001 a FR-016, research.md Decisión 1. Grilla fija
 * 2x4 (kittypau_hero_widget_info.xml).
 *
 * ⚠️ Escrito y revisado por lectura, NO compilado en este entorno (no hay
 * Android SDK/Gradle disponibles acá -- research.md Decisión 0). Verificar la
 * superficie exacta de la API de `androidx.glance:glance-appwidget:1.2.0`
 * (imports, firmas) contra el SDK real al compilar por primera vez.
 *
 * Tap -- User Story 3, FR-011: abre `MainActivity` con
 * `EXTRA_TARGET_PATH` (`/today?petId=...` con sesión válida, `/login` si no)
 * -- ver `openAppIntent()` al final del archivo y `MainActivity.java`
 * (navegación real del WebView, tasks.md T024).
 */
class KittypauHeroWidget : GlanceAppWidget() {
    // Tamaño fijo (Assumptions del spec: sin resizable en esta versión) --
    // SizeMode.Single evita que Glance intente recomponer por breakpoints.
    override val sizeMode = SizeMode.Single

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
        val petId = WidgetPrefs.petId(context, appWidgetId)
        val petName = WidgetPrefs.petName(context, appWidgetId)
        val sessionValid = WidgetPrefs.isSessionValid(context, appWidgetId)
        val snapshot = WidgetPrefs.snapshot(context, appWidgetId)

        provideContent {
            when {
                petId == null -> NeutralState(
                    message = "Tocá para elegir tu mascota",
                    action = openAppAction(context, "/today"),
                )
                !sessionValid -> NeutralState(
                    message = "Iniciá sesión para ver a tu mascota",
                    action = openAppAction(context, "/login"),
                )
                snapshot == null || !snapshot.hasFoodDevice -> NeutralState(
                    message = "${petName ?: "Tu mascota"}: sin dispositivo asignado todavía",
                    action = openAppAction(context, "/today?petId=$petId"),
                )
                else -> HeroContent(
                    context = context,
                    appWidgetId = appWidgetId,
                    petId = petId,
                    petName = petName,
                    snapshot = snapshot,
                )
            }
        }
    }
}

@Composable
private fun NeutralState(message: String, action: Action) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color(0xFFF1F5F9), Color(0xFF1E293B)))
            .padding(12.dp)
            .clickable(action),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = message,
            style = TextStyle(
                color = ColorProvider(Color(0xFF475569), Color(0xFFCBD5E1)),
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
            ),
        )
    }
}

@Composable
private fun HeroContent(
    context: Context,
    appWidgetId: Int,
    petId: String,
    petName: String?,
    snapshot: WidgetSnapshot,
) {
    val foodColor = Color(0xFF10B981) // emerald-500, FR-003/FR-012
    val waterColor = Color(0xFF0EA5E9) // sky-500, FR-004/FR-012

    Row(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color(0xFFEBB7AA), Color(0xFF3A2A26))) // --primary, FR-012
            .padding(10.dp)
            .clickable(openAppAction(context, "/today?petId=$petId")),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Foto de la mascota -- FR-002. Glance no puede pedir red en el
        // propio render: `WidgetRefreshWorker` (T019, US2) la descarga de
        // `petPhotoUrl` y la cachea como archivo local antes de cada
        // refresco; acá solo se lee ese archivo. Sin caché todavía (primer
        // render) o si falla la descarga, mismo fallback visual que usa hoy
        // el hero real de /today (`pet_profile.jpeg`, portado 1:1 a
        // pet_profile_fallback.jpg).
        Image(
            provider = petPhotoImageProvider(context, appWidgetId),
            contentDescription = petName ?: "Mascota",
            modifier = GlanceModifier
                .size(64.dp)
                .cornerRadius(32.dp),
        )

        Column(
            modifier = GlanceModifier
                .fillMaxWidth()
                .padding(start = 10.dp),
        ) {
            // Barras de comida/agua -- FR-003/FR-004
            WellnessBar(
                label = "Comida",
                percentage = snapshot.foodPercentage,
                color = foodColor,
            )
            Row(modifier = GlanceModifier.height(4.dp)) {}
            if (snapshot.hasWaterDevice) {
                WellnessBar(
                    label = "Agua",
                    percentage = snapshot.waterPercentage,
                    color = waterColor,
                )
                Row(modifier = GlanceModifier.height(6.dp)) {}
            }

            // Círculos -- FR-005 (comida, con número) / FR-006 (agua, sin número)
            Row(verticalAlignment = Alignment.CenterVertically) {
                WellnessCircle(
                    color = foodColor,
                    icon = R.drawable.ic_widget_food_bone,
                    number = snapshot.mealsToday,
                    contentDescription = "Comidas hoy",
                )
                Row(modifier = GlanceModifier.width(8.dp)) {}
                if (snapshot.hasWaterDevice) {
                    WellnessCircle(
                        color = waterColor,
                        icon = R.drawable.ic_widget_water_drop,
                        number = null, // FR-006/FR-015: nunca un conteo de agua inventado
                        contentDescription = "Hidratación",
                    )
                }
            }

            Row(modifier = GlanceModifier.height(4.dp)) {}

            // Últimas horas -- FR-007/FR-008, texto muy chico, "sin registro" honesto
            Text(
                text = "Últ. comida: ${formatHourOrUnknown(snapshot.lastMealDetectedAt)}",
                style = TextStyle(color = ColorProvider(Color.White, Color.White), fontSize = 9.sp),
            )
            if (snapshot.hasWaterDevice) {
                Text(
                    text = "Últ. agua: ${formatHourOrUnknown(snapshot.lastWaterEventAt)}",
                    style = TextStyle(color = ColorProvider(Color.White, Color.White), fontSize = 9.sp),
                )
            }
        }
    }
}

@Composable
private fun WellnessBar(label: String, percentage: Int?, color: Color) {
    val pct = (percentage ?: 0).coerceIn(0, 100)
    Column(modifier = GlanceModifier.fillMaxWidth()) {
        Text(
            text = "$label ${percentage?.let { "$it%" } ?: "N/D"}",
            style = TextStyle(color = ColorProvider(Color.White, Color.White), fontSize = 10.sp, fontWeight = FontWeight.Medium),
        )
        // `GlanceModifier.fillMaxWidth(fraction = ...)` no existe en
        // glance-appwidget 1.2.0 (verificado contra el jar real al compilar
        // por primera vez) -- `LinearProgressIndicator` es el componente
        // nativo del propio SDK para esto, sin reimplementar la barra a mano.
        LinearProgressIndicator(
            progress = pct.coerceAtLeast(4) / 100f,
            modifier = GlanceModifier.fillMaxWidth().height(6.dp).cornerRadius(3.dp),
            color = ColorProvider(color, color),
            backgroundColor = ColorProvider(Color(0x33FFFFFF), Color(0x33FFFFFF)),
        )
    }
}

@Composable
private fun WellnessCircle(color: Color, icon: Int, number: Int?, contentDescription: String) {
    Box(
        modifier = GlanceModifier
            .size(34.dp)
            .cornerRadius(17.dp)
            .background(ColorProvider(color, color)),
        contentAlignment = Alignment.Center,
    ) {
        // Ícono detrás -- FR-005/FR-006 ("símbolo detrás del número").
        Image(
            provider = ImageProvider(icon),
            contentDescription = contentDescription,
            modifier = GlanceModifier.size(20.dp),
        )
        // Número encima, contrastando -- FR-005. Ausente para agua (FR-006/FR-015).
        if (number != null) {
            Text(
                text = number.toString(),
                style = TextStyle(
                    color = ColorProvider(Color.White, Color.White),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                ),
            )
        }
    }
}

/**
 * Ruta del archivo local donde `WidgetRefreshWorker` cachea la foto
 * descargada de `petPhotoUrl` -- compartida entre ese worker y el render de
 * acá para que ambos apunten al mismo archivo por `appWidgetId`.
 */
fun petPhotoCacheFile(context: Context, appWidgetId: Int): java.io.File =
    java.io.File(context.filesDir, "widget_photos/pet_$appWidgetId.jpg")

private fun petPhotoImageProvider(context: Context, appWidgetId: Int): ImageProvider {
    val file = petPhotoCacheFile(context, appWidgetId)
    if (file.exists()) {
        val bitmap = try {
            BitmapFactory.decodeFile(file.absolutePath)
        } catch (_: Exception) {
            null
        }
        if (bitmap != null) return ImageProvider(bitmap)
    }
    return ImageProvider(R.drawable.pet_profile_fallback)
}

// `actionStartActivity` en glance-appwidget 1.2.0 no tiene overload de
// `Intent` (solo `ComponentName`/`Class`+`ActionParameters`, verificado
// contra el jar real al compilar por primera vez) -- el path viaja como
// ActionParameters, que Glance mete como extra del Intent real que arma
// para lanzar la Activity, con el mismo nombre que la Key.
private val targetPathKey = ActionParameters.Key<String>(MainActivity.EXTRA_TARGET_PATH)

/** Acción para abrir `MainActivity` en un path dado -- User Story 3, FR-011. */
private fun openAppAction(context: Context, path: String): Action =
    actionStartActivity(
        ComponentName(context, MainActivity::class.java),
        actionParametersOf(targetPathKey to path),
    )

// ponytail: `java.time` (Instant/LocalDateTime) recién es nativo desde
// API 26 -- este proyecto tiene minSdkVersion 24 (SPEC_06_Mobile_APK_2026.md),
// usar java.time acá rompería en Android 7. `SimpleDateFormat` está
// disponible desde API 1, sin agregar `coreLibraryDesugaring` al build.
// Techo: no parsea offsets con ':' (ej. "+00:00"), solo "Z"/"+0000" -- que es
// el formato real que devuelve Postgres/Supabase para `timestamptz` hoy. Si
// eso cambia, degrada a "sin registro hoy" en vez de crashear (mismo
// criterio honesto del resto de esta función).
private fun formatHourOrUnknown(iso: String?): String {
    if (iso == null) return "sin registro hoy" // FR-007/FR-008/FR-015 -- nunca inventar una hora
    return try {
        val normalized = iso.replace(Regex("\\.\\d+"), "").replace("Z", "+0000")
        val parser = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ", java.util.Locale.US)
        val date = parser.parse(normalized) ?: return "sin registro hoy"
        // Hora LOCAL del dispositivo (default timezone), no UTC.
        java.text.SimpleDateFormat("HH:mm", java.util.Locale.US).format(date)
    } catch (_: Exception) {
        "sin registro hoy"
    }
}
