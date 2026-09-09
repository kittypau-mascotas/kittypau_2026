"use client";

import { useEffect, useRef } from "react";
import { getValidAccessToken } from "@/lib/auth/token";

/**
 * Registra el token de FCM del celular contra `/api/push/register-token` --
 * pieza que le falta a `useHungerBarEventNotifications` (que solo funciona
 * con la app abierta) para que "comió"/"le sirvieron" llegue vía el cron
 * server-side aunque la app esté cerrada. Ver
 * Knowledge/29_Specs/008-push-notifications-fcm/plan.md.
 *
 * Solo corre en la APK nativa (Capacitor) — no-op en web, mismo patrón que
 * el resto de los hooks de notificaciones. Un solo intento por sesión de la
 * app (no reintenta en cada render); si falla, el próximo login/apertura de
 * la app lo vuelve a intentar solo.
 *
 * `enabled` = ya se confirmó sesión iniciada (el propio `getValidAccessToken()`
 * de más abajo es quien realmente valida el token contra Supabase -- este
 * flag solo evita intentarlo mientras la pantalla todavía no sabe si hay
 * sesión).
 */
export function usePushTokenRegistration(enabled: boolean) {
  const intentadoRef = useRef(false);

  useEffect(() => {
    if (!enabled || intentadoRef.current) return;
    intentadoRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } =
          await import("@capacitor/push-notifications");
        const permission = await PushNotifications.requestPermissions();
        if (cancelled || permission.receive !== "granted") return;

        // El registro es async: el token real llega por el listener
        // "registration", no como valor de retorno de register().
        PushNotifications.addListener("registration", (token) => {
          if (cancelled) return;
          void getValidAccessToken().then((accessToken) => {
            if (!accessToken) return;
            void fetch("/api/push/register-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                token: token.value,
                platform: Capacitor.getPlatform(),
              }),
            }).catch(() => {
              // Best-effort -- se reintenta en la próxima apertura de la app.
            });
          });
        });
        PushNotifications.addListener("registrationError", () => {
          // Best-effort, sin UI de error -- mismo criterio que el resto de
          // los hooks de notificaciones nativas.
        });

        await PushNotifications.register();
      } catch {
        // no es plataforma nativa o el plugin no está disponible
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
