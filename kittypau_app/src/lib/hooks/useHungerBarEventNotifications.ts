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
 *
 * Foto real de la mascota -- investigado 2026-09-09, DESCARTADO para esta
 * notificación: `@capacitor/local-notifications` en Android no tiene forma
 * de mostrar una imagen dinámica. Confirmado leyendo el plugin nativo
 * (`LocalNotificationManager.java`/`AssetUtil.java`): `largeIcon` resuelve
 * el string SIEMPRE como nombre de recurso `drawable` empaquetado
 * (`getResources().getIdentifier(...)`, sin fallback a URI/archivo) y
 * `attachments` se parsea pero nunca se lee en ningún lado del código
 * Android -- es una función que solo existe para iOS en este plugin. No
 * hay combinación de campos que lo logre sin parchear el plugin nativo.
 * La foto real de la mascota SÍ funciona en el push real (FCM, `imageUrl`
 * en `lib/push/fcm.ts`) porque ahí es Firebase quien la baja y la renderiza
 * del lado nativo -- pendiente solo de que exista el proyecto Firebase.
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
