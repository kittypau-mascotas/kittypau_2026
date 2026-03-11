"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let showFired = false;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;
    let showTimeout: ReturnType<typeof setTimeout> | null = null;
    let maxTimeout: ReturnType<typeof setTimeout> | null = null;

    const shouldPlay = window.sessionStorage.getItem(
      "kittypau_play_login_sound",
    );
    const isLoginTransition = Boolean(shouldPlay);

    // Avoid flash on very fast route transitions.
    showTimeout = setTimeout(() => {
      if (cancelled) return;
      showFired = true;
      setVisible(true);
    }, 90);

    const hideOverlay = (delayMs = 0) => {
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (!cancelled) setVisible(false);
      }, delayMs);
    };

    if (!isLoginTransition) {
      // Wait for at least one frame after route change before hiding.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          if (!showFired && showTimeout) {
            clearTimeout(showTimeout);
            showTimeout = null;
            setVisible(false);
            return;
          }
          hideOverlay(280);
        });
      });
    } else {
      window.sessionStorage.removeItem("kittypau_play_login_sound");
      const audio = audioRef.current;
      const minVisibleMs = 1300;
      const maxVisibleMs = 2600;
      const startedAt = performance.now();
      const finish = () => {
        const elapsed = performance.now() - startedAt;
        const remaining = Math.max(0, minVisibleMs - elapsed);
        hideOverlay(remaining);
      };

      if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.4;
        const onEnded = () => finish();
        audio.addEventListener("ended", onEnded, { once: true });
        maxTimeout = setTimeout(finish, maxVisibleMs);
        void audio.play().catch(() => {
          finish();
        });

        return () => {
          cancelled = true;
          audio.removeEventListener("ended", onEnded);
          if (showTimeout) clearTimeout(showTimeout);
          if (hideTimeout) clearTimeout(hideTimeout);
          if (maxTimeout) clearTimeout(maxTimeout);
        };
      }

      maxTimeout = setTimeout(finish, minVisibleMs);
    }

    return () => {
      cancelled = true;
      if (showTimeout) clearTimeout(showTimeout);
      if (hideTimeout) clearTimeout(hideTimeout);
      if (maxTimeout) clearTimeout(maxTimeout);
    };
  }, [pathname]);

  return (
    <div className="route-loading-overlay" data-visible={visible}>
      <audio ref={audioRef} src="/audio/sonido_marca.mp3" preload="auto" />
      <div className="route-loading-badge" aria-hidden="true">
        <Image
          src="/logo_carga.jpg"
          alt=""
          width={200}
          height={200}
          className="route-loading-hero"
        />
      </div>
      <div className="route-loading-indicator" aria-hidden />
      <span className="route-loading-label">Cargando</span>
    </div>
  );
}
