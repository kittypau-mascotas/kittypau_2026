"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TrialRpgDialog from "@/app/_components/trial-rpg-dialog";

export default function InicioClientePage() {
  const GUIDE_SEEN_KEY = "kittypau_client_guide_seen_v1";
  const guideLine = "Bienvenido a Kittypau";

  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [guideTypedText, setGuideTypedText] = useState("");
  const [isGuideTyping, setIsGuideTyping] = useState(false);
  const [isGuideMuted, setIsGuideMuted] = useState(false);
  const [isGuideCatAwake] = useState(true);
  const [guideCatEyeOffset, setGuideCatEyeOffset] = useState({ x: 0, y: 0 });
  const [guideCatSvg, setGuideCatSvg] = useState<string | null>(null);

  const guideCatRef = useRef<HTMLDivElement | null>(null);
  const guideAudioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  const stopGuideAudio = useCallback(() => {
    const audio = guideAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const playGuideAudio = useCallback(() => {
    const audio = guideAudioRef.current;
    if (!audio) return;
    if (isGuideMuted) return;
    audio.loop = true;
    // Randomize between 0.30 and 0.40.
    audio.volume = 0.3 + Math.random() * 0.1;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, [isGuideMuted]);

  const closeGuide = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUIDE_SEEN_KEY, "1");
    }
    setIsGuideVisible(false);
    setGuideTypedText("");
    setIsGuideTyping(false);
    setGuideCatEyeOffset({ x: 0, y: 0 });
    startedRef.current = false;
    stopGuideAudio();
  }, [stopGuideAudio]);

  const onGuideAdvance = useCallback(() => {
    if (!isGuideVisible) return;
    if (isGuideTyping) {
      setGuideTypedText(guideLine);
      setIsGuideTyping(false);
      stopGuideAudio();
      return;
    }
    closeGuide();
  }, [closeGuide, guideLine, isGuideTyping, isGuideVisible, stopGuideAudio]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(GUIDE_SEEN_KEY) === "1") return;

    // Avoid setState directly in effect body (lint rule).
    const timer = window.setTimeout(() => {
      setIsGuideVisible(true);
      setGuideTypedText("");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isGuideVisible) return;

    if (!guideCatSvg) {
      void fetch("/illustrations/cat_awake_copy.svg")
        .then((res) => (res.ok ? res.text() : ""))
        .then((svgText) => setGuideCatSvg(svgText || null))
        .catch(() => setGuideCatSvg(null));
    }
  }, [guideCatSvg, isGuideVisible, stopGuideAudio]);

  useEffect(() => {
    if (!isGuideVisible) return;

    const onPointerMove = (event: PointerEvent) => {
      const rect = guideCatRef.current?.getBoundingClientRect();
      if (!rect) return;
      const catCenterX = rect.left + rect.width * 0.46;
      const catCenterY = rect.top + rect.height * 0.46;
      const dx = event.clientX - catCenterX;
      const dy = event.clientY - catCenterY;
      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, value));

      setGuideCatEyeOffset({
        x: clamp(dx / 58, -0.95, 0.95),
        y: clamp(dy / 68 - 0.1, -0.74, 0.44),
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [isGuideVisible]);

  useEffect(() => {
    if (!isGuideVisible) return;
    if (startedRef.current) return;

    startedRef.current = true;

    let startTimer: number | null = null;
    let typingTimer: number | null = null;

    startTimer = window.setTimeout(() => {
      setGuideTypedText("");
      setIsGuideTyping(true);
      playGuideAudio();

      let charIndex = 0;
      typingTimer = window.setInterval(() => {
        charIndex += 1;
        setGuideTypedText(guideLine.slice(0, charIndex));
        if (charIndex >= guideLine.length) {
          if (typingTimer !== null) window.clearInterval(typingTimer);
          setIsGuideTyping(false);
          stopGuideAudio();
        }
      }, 38);
    }, 1000);

    return () => {
      if (startTimer !== null) window.clearTimeout(startTimer);
      if (typingTimer !== null) window.clearInterval(typingTimer);
      stopGuideAudio();
    };
  }, [guideLine, isGuideVisible, playGuideAudio, stopGuideAudio]);

  useEffect(() => {
    if (!isGuideVisible) return;
    if (!isGuideMuted) return;
    stopGuideAudio();
  }, [isGuideMuted, isGuideVisible, stopGuideAudio]);

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <audio
          ref={guideAudioRef}
          src="/audio/dialogo_rpg.mp3"
          preload="auto"
        />

        {isGuideVisible ? (
          <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-[120] flex justify-center px-4">
            <div className="pointer-events-auto">
              <TrialRpgDialog
                typedText={guideTypedText}
                isMuted={isGuideMuted}
                onToggleMute={() => setIsGuideMuted((prev) => !prev)}
                onClose={closeGuide}
                onAdvance={onGuideAdvance}
                catSvg={guideCatSvg ?? ""}
                isCatAwake={isGuideCatAwake}
                catEyeOffset={guideCatEyeOffset}
                catRef={guideCatRef}
                ariaLabel="Avanzar guia"
              />
            </div>
          </div>
        ) : null}

        <section className="surface-card freeform-rise px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Inicio cliente
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Vista en blanco
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Esta vista queda vacía para diseñar la experiencia de clientes
            reales en próximas iteraciones.
          </p>
        </section>
      </div>
    </div>
  );
}
