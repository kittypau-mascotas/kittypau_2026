import { registerPlugin } from "@capacitor/core";

/**
 * Interfaz TS del plugin nativo `KittypauWidgetPlugin.kt` (Fase B de
 * Knowledge/29_Specs/010-widget-android-hero/tasks.md). Ver contrato
 * completo en contracts/widget-pin-plugin.md -- un solo método, sin
 * parámetros: la selección de mascota vive en la configuration Activity
 * nativa (research.md Decisión 2), no hace falta pasarle nada desde acá.
 */
export interface KittypauWidgetPlugin {
  /**
   * Dispara `AppWidgetManager.requestPinAppWidget()`. `supported: false`
   * significa que el launcher/versión de Android no soporta el pin directo
   * -- la UI debe caer al mensaje instructivo de fallback, no asumir éxito.
   */
  requestPin(): Promise<{ supported: boolean }>;
}

// `registerPlugin` resuelve la implementación nativa real en la APK
// (Android) y queda como no-op silencioso fuera de una plataforma nativa --
// el guard real de "no es la APK nativa" vive en
// `@/lib/hooks/useAddWidgetToHomeScreen.ts` (Capacitor.isNativePlatform()).
export const KittypauWidget =
  registerPlugin<KittypauWidgetPlugin>("KittypauWidget");
