"use client";

import { useEffect } from "react";

const THANKS_KEY = "kp_native_thanks_notif_v1";

export default function NativeThanksNotification() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        if (window.localStorage.getItem(THANKS_KEY) === "1") return;

        const { LocalNotifications } =
          await import("@capacitor/local-notifications");

        const permission = await LocalNotifications.requestPermissions();
        if (cancelled) return;
        if (permission.display !== "granted") return;

        const at = new Date(Date.now() + 2500);

        await LocalNotifications.schedule({
          notifications: [
            {
              id: 50001,
              title: "Gracias por adquirir Kittypau",
              body: "Bienvenido. Estamos felices de cuidar a tu mascota contigo",
              schedule: { at },
            },
          ],
        });

        window.localStorage.setItem(THANKS_KEY, "1");
      } catch {
        // Best-effort on native only. No-op on web or if plugin missing.
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
