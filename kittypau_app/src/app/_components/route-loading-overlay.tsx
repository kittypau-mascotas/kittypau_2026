"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;
    if (typeof window === "undefined") return;
    const shouldPlay = window.sessionStorage.getItem("kittypau_play_login_sound");
    if (!shouldPlay) return;
    window.sessionStorage.removeItem("kittypau_play_login_sound");
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, [visible]);

  return (
    <div className="route-loading-overlay" data-visible={visible}>
      <audio ref={audioRef} src="/audio/sonido_marca.mp3" preload="auto" />
      <img
        src="/logo_carga.jpg"
        alt="Kittypau"
        className="route-loading-hero"
        aria-hidden
      />
      <div className="route-loading-indicator" aria-hidden />
      <span className="route-loading-label">Cargando</span>
    </div>
  );
}
