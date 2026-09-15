"use client";

import { useCallback, useState } from "react";

/**
 * Puente al plugin nativo `KittypauWidget` (Capacitor) que dispara
 * `AppWidgetManager.requestPinAppWidget()` desde un botón dentro de la app --
 * objetivo explícito de Mauro ("una opcion para descargar o vincular un
 * widget... en el celu", no solo el selector manual del sistema). Ver
 * Knowledge/29_Specs/010-widget-android-hero/contracts/widget-pin-plugin.md
 * y research.md Decisión 2.
 *
 * Mismo patrón de import dinámico + no-op fuera de la APK nativa que
 * `@/lib/hooks/usePushTokenRegistration.ts`.
 */
export type AddWidgetResult =
  | { kind: "supported" }
  | { kind: "unsupported" } // launcher/versión de Android sin requestPinAppWidget
  | { kind: "unavailable" }; // no es la APK nativa (o el plugin nativo aún no está compilado)

export function useAddWidgetToHomeScreen() {
  const [pending, setPending] = useState(false);

  const requestPin = useCallback(async (): Promise<AddWidgetResult> => {
    setPending(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return { kind: "unavailable" };

      const { KittypauWidget } =
        await import("@/lib/native/kittypau-widget-plugin");
      const { supported } = await KittypauWidget.requestPin();
      return supported ? { kind: "supported" } : { kind: "unsupported" };
    } catch {
      // Plataforma no nativa, plugin todavía no compilado en el APK
      // instalado, u otro fallo -- best-effort, sin romper la pantalla.
      return { kind: "unavailable" };
    } finally {
      setPending(false);
    }
  }, []);

  return { requestPin, pending };
}
