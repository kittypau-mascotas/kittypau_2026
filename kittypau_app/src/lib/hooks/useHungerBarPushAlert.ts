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

export type ScheduleHungerBarAlertResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Agenda directamente, sin pasar por el efecto — usado por el hook de abajo
 * (con el horario real) y por el botón manual de QA (con un delay corto).
 * No-op silencioso en web o si el plugin/permiso falla — devuelve el motivo
 * exacto (`reason`) para poder diagnosticar en un dispositivo real sin
 * consola (ver el botón de QA en /pet).
 */
export async function scheduleHungerBarAlert(params: {
  petId: string;
  petName: string | undefined;
  alertAt: Date;
}): Promise<ScheduleHungerBarAlertResult> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      return { ok: false, reason: "no es plataforma nativa (Capacitor)" };
    }
    if (
      !Number.isFinite(params.alertAt.getTime()) ||
      params.alertAt.getTime() <= Date.now()
    ) {
      return { ok: false, reason: "horario ya paso o invalido" };
    }

    const { LocalNotifications } =
      await import("@capacitor/local-notifications");
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== "granted") {
      return { ok: false, reason: `permiso: ${permission.display}` };
    }

    const id = hashToNotificationId(params.petId);
    await LocalNotifications.cancel({ notifications: [{ id }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: "Kittypau",
          body: `${params.petName ?? "Tu mascota"} debería haber comido hace ${ALERT_THRESHOLD_HOURS}h. Revisa el plato.`,
          schedule: { at: params.alertAt },
          smallIcon: "ic_stat_kittypau",
          largeIcon: "ic_notification_kittypau",
          iconColor: "#ebb6a8",
          // sin `sound`: usa el sonido de notificaciones que el usuario
          // tenga configurado en el celular (canal "default" de Android).
        },
      ],
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: `excepcion: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
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
    const alertAt = new Date(
      new Date(estimatedNextMealAt).getTime() +
        ALERT_THRESHOLD_HOURS * 3_600_000,
    );

    void scheduleHungerBarAlert({ petId, petName, alertAt }).then((result) => {
      if (!cancelled && result.ok) {
        scheduledForRef.current = estimatedNextMealAt;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [petId, petName, status, estimatedNextMealAt]);
}
