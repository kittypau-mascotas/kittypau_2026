"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppNav from "@/app/(app)/_components/app-nav";
import { AppDataProvider } from "@/lib/context/app-context";

export default function DemoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ownerName, setOwnerName] = useState("Invitado");
  const [petName, setPetName] = useState("Tu mascota");
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [guideTypedText, setGuideTypedText] = useState("");
  const [isGuideTyping, setIsGuideTyping] = useState(false);
  const [isGuideMuted, setIsGuideMuted] = useState(false);
  const [isGuideCatAwake, setIsGuideCatAwake] = useState(true);
  const [guideCatEyeOffset, setGuideCatEyeOffset] = useState({ x: 0, y: 0 });
  const [guideCatSvg, setGuideCatSvg] = useState<string | null>(null);
  const guideCatRef = useRef<HTMLDivElement | null>(null);
  const guideAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDemo = window.localStorage.getItem("kittypau_demo_mode") === "1";
    if (!isDemo) {
      router.replace("/login");
      return;
    }
    const owner = window.localStorage.getItem("kittypau_demo_owner_name");
    const pet = window.localStorage.getItem("kittypau_demo_pet_name");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (owner) setOwnerName(owner);

    if (pet) setPetName(pet);

    const shouldShow =
      window.localStorage.getItem("kittypau_demo_show_rpg") === "1";
    if (shouldShow) {
      window.localStorage.removeItem("kittypau_demo_show_rpg");

      setIsGuideVisible(true);

      setGuideIndex(0);

      setGuideTypedText("");
    }
  }, [router]);

  const updatedAtLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    [],
  );

  const guideLines = useMemo(() => {
    const owner = ownerName.trim();
    const ownerLine = owner
      ? `“${owner}”... qué nombre más aburrido`
      : "Tu nombre es aburrido, muy aburrido";
    return [
      "…¿Otra vez un humano?",
      ownerLine,
      "¿Y ahora qué? ¿Quieres saber qué hace esta app?",
      "Yo vigilo a tu mascota",
      "Reviso si está comiendo",
      "Si está tomando agua",
      "Y si algo anda mal",
      "Básicamente… hago tu trabajo",
      "...",
      "Los humanos se distraen fácil",
      "Son un éxito de la evolución... jajajaja",
      "Redes sociales",
      "Reuniones",
      "Stalkear a tu ex",
      "Horas en TikTok",
      "Y les quita tiempo muy importante para nuestro cuidado",
      "Para eso está Kittypau",
    ] as const;
  }, [ownerName]);

  const stopGuideAudio = useCallback(() => {
    const audio = guideAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  useEffect(() => {
    if (!isGuideVisible) return;
    if (!isGuideMuted) return;
    stopGuideAudio();
  }, [isGuideMuted, isGuideVisible, stopGuideAudio]);

  const closeGuide = () => {
    setIsGuideVisible(false);
    setGuideIndex(0);
    setGuideTypedText("");
    setIsGuideTyping(false);
    stopGuideAudio();
  };

  const toggleGuideMute = () => {
    setIsGuideMuted((prev) => !prev);
  };

  const onGuideAdvance = useCallback(() => {
    if (!isGuideVisible) return;
    const lastIndex = guideLines.length - 1;
    if (isGuideTyping) {
      setGuideTypedText(guideLines[guideIndex] ?? "");
      setIsGuideTyping(false);
      stopGuideAudio();
      return;
    }
    if (guideIndex < lastIndex) {
      setGuideIndex((prev) => Math.min(lastIndex, prev + 1));
      return;
    }
    closeGuide();
  }, [guideIndex, guideLines, isGuideTyping, isGuideVisible, stopGuideAudio]);

  const onGuideKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onGuideAdvance();
    }
  };

  useEffect(() => {
    if (!isGuideVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuideTypedText("");

      setIsGuideTyping(false);

      setIsGuideCatAwake(true);

      setGuideCatEyeOffset({ x: 0, y: 0 });
      stopGuideAudio();
      return;
    }

    if (!guideCatSvg) {
      void fetch("/illustrations/cat_awake_copy.svg")
        .then((res) => (res.ok ? res.text() : ""))
        .then((svgText) => setGuideCatSvg(svgText || null))
        .catch(() => setGuideCatSvg(null));
    }

    let sleepTimer: number | null = null;
    let wakeTimer: number | null = null;

    const schedule = () => {
      const randomDelay = 5200 + Math.floor(Math.random() * 3600);
      sleepTimer = window.setTimeout(() => {
        setIsGuideCatAwake(false);
        wakeTimer = window.setTimeout(() => {
          setIsGuideCatAwake(true);
          schedule();
        }, 1000);
      }, randomDelay);
    };

    schedule();
    return () => {
      if (sleepTimer !== null) window.clearTimeout(sleepTimer);
      if (wakeTimer !== null) window.clearTimeout(wakeTimer);
      setIsGuideCatAwake(true);
    };
  }, [guideCatSvg, isGuideVisible, stopGuideAudio]);

  useEffect(() => {
    if (!isGuideVisible || !isGuideCatAwake) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuideCatEyeOffset({ x: 0, y: 0 });
      return;
    }

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
  }, [isGuideCatAwake, isGuideVisible]);

  useEffect(() => {
    if (!isGuideVisible) return;
    if (guideIndex >= guideLines.length) return;

    const line = guideLines[guideIndex];
    let pointer = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuideTypedText("");

    setIsGuideTyping(true);

    const audio = guideAudioRef.current;
    if (audio && !isGuideMuted) {
      audio.loop = true;
      audio.volume = 0.4;
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    }

    const typingTimer = window.setInterval(() => {
      pointer += 1;
      setGuideTypedText(line.slice(0, pointer));
      if (pointer >= line.length) {
        window.clearInterval(typingTimer);
        stopGuideAudio();
        setIsGuideTyping(false);
      }
    }, 28);

    return () => {
      window.clearInterval(typingTimer);
      stopGuideAudio();
      setIsGuideTyping(false);
    };
  }, [guideIndex, guideLines, isGuideVisible, stopGuideAudio]);

  const selectedMenu = (searchParams.get("menu") ?? "today") as
    | "today"
    | "story"
    | "pet"
    | "bowl";
  const isPendingSection = selectedMenu !== "today";
  const pendingLabel =
    selectedMenu === "story"
      ? "Story"
      : selectedMenu === "pet"
        ? "Mascota"
        : selectedMenu === "bowl"
          ? "Plato"
          : "Hoy";

  const exitDemo = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("kittypau_demo_mode");
      window.localStorage.removeItem("kittypau_demo_owner_name");
      window.localStorage.removeItem("kittypau_demo_pet_name");
      window.localStorage.removeItem("kittypau_demo_device_id");
      window.localStorage.removeItem("kittypau_demo_show_rpg");
    }
    router.push("/login");
  };

  return (
    <AppDataProvider>
      <div className="app-shell">
        <AppNav />
        <div className="app-content">
          <main className="min-h-screen px-4 py-4 md:px-6">
            <audio
              ref={guideAudioRef}
              src="/audio/dialogo_rpg.mp3"
              preload="auto"
            />
            {isGuideVisible ? (
              <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-[120] flex justify-center px-4">
                <div className="pointer-events-auto trial-rpg-modal w-full max-w-lg">
                  <div
                    className="trial-rpg-shell"
                    role="button"
                    tabIndex={0}
                    onClick={onGuideAdvance}
                    onKeyDown={onGuideKeyDown}
                    aria-label="Avanzar dialogo"
                  >
                    <div
                      className="trial-rpg-controls"
                      aria-label="Controles de dialogo"
                    >
                      <button
                        type="button"
                        className="trial-rpg-iconbtn"
                        aria-label="Cerrar dialogo"
                        onClick={(event) => {
                          event.stopPropagation();
                          closeGuide();
                        }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 6l12 12" />
                          <path d="M18 6L6 18" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="trial-rpg-iconbtn"
                        aria-label={
                          isGuideMuted ? "Activar sonido" : "Silenciar sonido"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleGuideMute();
                        }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M11 5L6 9H3v6h3l5 4V5z" />
                          {isGuideMuted ? (
                            <>
                              <path d="M16 9l5 6" />
                              <path d="M21 9l-5 6" />
                            </>
                          ) : (
                            <path d="M16 9a5 5 0 0 1 0 6" />
                          )}
                        </svg>
                      </button>
                    </div>
                    <div className="trial-rpg-copy">
                      <p className="trial-rpg-line">
                        {guideTypedText}
                        <span
                          className="trial-rpg-caret"
                          aria-hidden={guideTypedText.length === 0}
                        >
                          |
                        </span>
                      </p>
                    </div>
                    <div
                      className={`trial-rpg-cat kp-trial-cat mouse-detector${
                        isGuideCatAwake ? " is-awake" : ""
                      }`}
                      ref={guideCatRef}
                      style={
                        {
                          "--cat-eye-x": `${guideCatEyeOffset.x}px`,
                          "--cat-eye-y": `${guideCatEyeOffset.y}px`,
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    >
                      <div className="cat">
                        <div className="sleep-symbol" aria-hidden="true">
                          <span className="z z1">Z</span>
                          <span className="z z2">z</span>
                          <span className="z z3">Z</span>
                        </div>
                        <div
                          className="thecat"
                          dangerouslySetInnerHTML={{
                            __html: guideCatSvg ?? "",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {isPendingSection ? (
              <section className="mx-auto mt-1 w-full max-w-6xl rounded-[var(--radius)] border border-slate-200/80 bg-white px-5 py-8 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.4)] md:px-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Cuenta de prueba
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  {pendingLabel} pendiente
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Esta sección se habilitará en próximas iteraciones del modo
                  prueba.
                </p>
              </section>
            ) : (
              <section className="mx-auto mt-1 w-full max-w-6xl rounded-[var(--radius)] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.4)] md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/pet_profile.jpeg"
                      alt={`Foto de ${petName}`}
                      width={128}
                      height={128}
                      className="h-24 w-24 rounded-full border border-slate-200 object-cover"
                    />
                    <div>
                      <h1 className="text-3xl font-semibold text-slate-900">
                        {petName}
                      </h1>
                      <p className="mt-1 text-sm text-slate-500">
                        Perro · Demo · small · adult · 0 kg
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Titular: {ownerName}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                      Actualizado el {updatedAtLabel}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-[10px] border border-rose-100 bg-rose-50/50 px-3 py-2">
                        <p className="text-xs font-semibold text-rose-700">
                          Alimentacion
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          2 veces/dia
                        </p>
                        <p className="text-xs text-slate-600">
                          Consumo: 190 g /dia
                        </p>
                      </div>
                      <div className="rounded-[10px] border border-rose-100 bg-rose-50/50 px-3 py-2">
                        <p className="text-xs font-semibold text-rose-700">
                          Hidratacion
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          4 veces/dia
                        </p>
                        <p className="text-xs text-slate-600">
                          Consumo: 280 ml /dia
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="mx-auto mt-4 flex w-full max-w-6xl items-center justify-between rounded-[var(--radius)] border border-slate-200/80 bg-white px-4 py-3 md:px-6">
              <p className="text-sm text-slate-600">
                Esta es una vista de demostracion personalizada para explorar
                Kittypau.
              </p>
              <button
                type="button"
                onClick={exitDemo}
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Salir de prueba
              </button>
            </section>
          </main>
        </div>
      </div>
    </AppDataProvider>
  );
}
