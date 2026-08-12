"use client";

import { useEffect, useRef } from "react";
import { ALERT_THRESHOLD_HOURS } from "@/lib/hunger-bar";

/**
 * Agenda una notificación push local (Capacitor LocalNotifications) para el
 * momento exacto en que la alerta visual del hunger bar se activaría —
 * `estimatedNextMealAt + ALERT_THRESHOLD_HOURS`, mismo umbral que ya usa la
 * barra en pantalla (ver Knowledge/05_API/SPEC_HungerBar_Alertas.md).
 * SPEC_03 Pilar 3: el cálculo ya existía, esto es solo el disparador.
 *
 * Solo corre en la APK nativa (Capacitor) — no-op en web, mismo patrón que
 * `native-thanks-notification.tsx`. Se re-agenda solo cuando cambia
 * `estimatedNextMealAt` (nueva comida detectada corrió la barra), usando un
 * id numérico estable por mascota para que agendar de nuevo reemplace la
 * notificación anterior en vez de acumular duplicados.
 */

function hashToNotificationId(petId: string): number {
  let hash = 5381;
  for (let i = 0; i < petId.length; i++) {
    hash = (hash * 33) ^ petId.charCodeAt(i);
  }
  // Rango positivo fijo, lejos del id 50001 usado por native-thanks-notification.
  return (Math.abs(hash) % 1_000_000) + 60_000;
}

export function useHungerBarPushAlert(params: {
  petId: string | null | undefined;
  petName: string | undefined;
  status: "ok" | "sin_datos" | "sin_dispositivo" | undefined;
  estimatedNextMealAt: string | null | undefined;
}) {
  const { petId, petName, status, estimatedNextMealAt } = params;
  const scheduledForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!petId || status !== "ok" || !estimatedNextMealAt) return;
    if (scheduledForRef.current === estimatedNextMealAt) return;

    let cancelled = false;

    const run = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const alertAt = new Date(
          new Date(estimatedNextMealAt).getTime() +
            ALERT_THRESHOLD_HOURS * 3_600_000,
        );
        // Ya debería estar activa (o no es un horario futuro válido) — la
        // barra visual ya cubre este caso si el usuario abre la app ahora.
        if (
          !Number.isFinite(alertAt.getTime()) ||
          alertAt.getTime() <= Date.now()
        ) {
          return;
        }

        const { LocalNotifications } =
          await import("@capacitor/local-notifications");
        const permission = await LocalNotifications.requestPermissions();
        if (cancelled || permission.display !== "granted") return;

        const id = hashToNotificationId(petId);
        await LocalNotifications.cancel({ notifications: [{ id }] });
        if (cancelled) return;
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title: "Kittypau",
              body: `${petName ?? "Tu mascota"} debería haber comido hace ${ALERT_THRESHOLD_HOURS}h. Revisa el plato.`,
              schedule: { at: alertAt },
            },
          ],
        });

        scheduledForRef.current = estimatedNextMealAt;
      } catch {
        // Best-effort, nativo solamente. No-op en web o si el plugin falla.
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [petId, petName, status, estimatedNextMealAt]);
}
