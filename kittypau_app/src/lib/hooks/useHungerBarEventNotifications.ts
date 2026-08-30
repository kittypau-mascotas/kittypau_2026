"use client";

import { useEffect, useRef } from "react";

/**
 * Notificación push local (Capacitor LocalNotifications) cuando el motor de
 * Investigacion_v2 confirma un evento nuevo de alimentación o servido (ver
 * Knowledge/29_Specs/007-motor-alimentacion-produccion/). Distinto de
 * `useHungerBarPushAlert` (que avisa cuando se ATRASA una comida) -- este
 * avisa positivamente cuando "comió" o "le sirvieron".
 *
 * Solo corre en la APK nativa (Capacitor) — no-op en web, mismo patrón que
 * `useHungerBarPushAlert`/`native-thanks-notification.tsx`. Solo notifica
 * eventos ya CONFIRMADOS (`isProvisional: false`) para no avisar un evento
 * que todavía puede recategorizarse (~180s+ de confirmación, ver
 * `motor-alimentacion/segmentacion.ts`).
 *
 * En el primer render se toma el `events` recibido como línea base sin
 * notificar nada (son eventos históricos, no "acaban de pasar") -- solo se
 * notifican los que aparecen NUEVOS en una carga posterior (poll cada 5min
 * en today/page.tsx).
 */

type EventoNotificable = {
  category: "alimentacion" | "servido" | "ruido";
  startAt: string;
  isProvisional: boolean;
};

function hashEventId(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 33) ^ key.charCodeAt(i);
  }
  // Rango propio, lejos de useHungerBarPushAlert (60_000+) y del thanks (50001).
  return (Math.abs(hash) % 1_000_000) + 70_000;
}

export async function notifyMealEvent(params: {
  petName: string | undefined;
  category: "alimentacion" | "servido";
  startAt: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      return { ok: false, reason: "no es plataforma nativa (Capacitor)" };
    }

    const { LocalNotifications } =
      await import("@capacitor/local-notifications");
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== "granted") {
      return { ok: false, reason: `permiso: ${permission.display}` };
    }

    const nombre = params.petName ?? "Tu mascota";
    const title =
      params.category === "alimentacion" ? "¡Comió!" : "Plato servido";
    const body =
      params.category === "alimentacion"
        ? `${nombre} acaba de comer.`
        : `Se sirvió comida en el plato de ${nombre}.`;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: hashEventId(`${params.category}:${params.startAt}`),
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) },
          smallIcon: "ic_stat_kittypau",
          largeIcon: "ic_notification_kittypau",
          iconColor: "#ebb6a8",
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

export function useHungerBarEventNotifications(params: {
  petName: string | undefined;
  events: EventoNotificable[] | undefined;
}) {
  const { petName, events } = params;
  // null = todavía no se estableció la línea base (primera carga)
  const conocidosRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!events) return;
    const actuales = new Set(
      events
        .filter(
          (e) =>
            !e.isProvisional &&
            (e.category === "alimentacion" || e.category === "servido"),
        )
        .map((e) => `${e.category}:${e.startAt}`),
    );

    if (conocidosRef.current === null) {
      // primera carga: historial, no "acaba de pasar" -- no notificar nada
      conocidosRef.current = actuales;
      return;
    }

    for (const key of actuales) {
      if (conocidosRef.current.has(key)) continue;
      const [category, startAt] = key.split(":") as [
        "alimentacion" | "servido",
        string,
      ];
      void notifyMealEvent({ petName, category, startAt });
    }
    conocidosRef.current = actuales;
  }, [events, petName]);
}
