"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import AppNav from "@/app/(app)/_components/app-nav";
import { chileCompactDatetime } from "@/lib/time/chile";
import { AppDataProvider } from "@/lib/context/app-context";
import TrialRpgDialogDock from "@/chatbot-gato/trial-rpg-dialog-dock";
import TrialRpgDialog from "@/chatbot-gato/trial-rpg-dialog";
import {
  DEMO_SCREEN_CONTEXT,
  type DemoChoice,
  type DemoGuideStep,
} from "@/chatbot-gato/demo-context";
import { fetchChatbotGatoResponse } from "@/chatbot-gato/client";

const DEMO_QUICK_PROMPTS = [
  "Qué es la demo",
  "Qué muestra Kittypau",
  "Cómo sigo",
] as const;
const SHOW_GUIDE_DIALOG = false;

export default function DemoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ownerName, setOwnerName] = useState("Invitado");
  const [petName, setPetName] = useState("Tu mascota");
  const [petType, setPetType] = useState<string | null>(null);
  const [demoEmail, setDemoEmail] = useState<string | null>(null);
  const [demoSource, setDemoSource] = useState<string | null>(null);
  const [demoRecordedAt, setDemoRecordedAt] = useState<string | null>(null);
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [guideStep, setGuideStep] = useState<DemoGuideStep>(0);
  const [guideChoice, setGuideChoice] = useState<DemoChoice | null>(null);
  const [isGuideMuted, setIsGuideMuted] = useState(false);
  const [isGuideCatAwake, setIsGuideCatAwake] = useState(true);
  const [guideCatEyeOffset, setGuideCatEyeOffset] = useState({ x: 0, y: 0 });
  const [guideCatSvg, setGuideCatSvg] = useState<string | null>(null);
  const [guideReplyText, setGuideReplyText] = useState("");
  const [guideDraft, setGuideDraft] = useState("");
  const [isGuideSubmitting, setIsGuideSubmitting] = useState(false);
  const [guideTypedText, setGuideTypedText] = useState("");
  const [isGuideTyping, setIsGuideTyping] = useState(false);
  const guideCatRef = useRef<HTMLDivElement | null>(null);
  const guideAudioRef = useRef<HTMLAudioElement | null>(null);
  const guideReplyHistoryRef = useRef<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isDemo = window.localStorage.getItem("kittypau_demo_mode") === "1";
    if (!isDemo) {
      window.localStorage.setItem("kittypau_demo_mode", "1");
      window.localStorage.setItem("kittypau_demo_owner_name", "Invitado");
      window.localStorage.setItem("kittypau_demo_pet_name", "Tu mascota");
      window.localStorage.setItem("kittypau_demo_device_id", "KPCL-DEMO");
      window.localStorage.setItem("kittypau_demo_kind", "demo");
      window.localStorage.setItem("kittypau_demo_show_rpg", "1");
      window.localStorage.removeItem("kittypau_demo_pet_type");
      window.localStorage.removeItem("kittypau_demo_email");
      window.localStorage.removeItem("kittypau_demo_source");
      window.localStorage.removeItem("kittypau_demo_recorded_at");
    }

    const owner = window.localStorage.getItem("kittypau_demo_owner_name");
    const pet = window.localStorage.getItem("kittypau_demo_pet_name");
    const kind = window.localStorage.getItem("kittypau_demo_pet_type");
    const email = window.localStorage.getItem("kittypau_demo_email");
    const source = window.localStorage.getItem("kittypau_demo_source");
    const recordedAt = window.localStorage.getItem("kittypau_demo_recorded_at");

    const guideDelayMs = 2800;
    const timer = window.setTimeout(() => {
      if (owner) setOwnerName(owner);
      if (pet) setPetName(pet);
      setPetType(kind);
      setDemoEmail(email);
      setDemoSource(source);
      setDemoRecordedAt(recordedAt);
      window.localStorage.removeItem("kittypau_demo_show_rpg");
      setIsGuideVisible(true);
      setGuideStep(0);
      setGuideChoice(null);
      setGuideReplyText("Sí? Pregunta por Kittypau.");
      guideReplyHistoryRef.current = ["Sí? Pregunta por Kittypau."];
    }, guideDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router]);

  const updatedAtLabel = useMemo(() => chileCompactDatetime(new Date()), []);
  const petAvatarSrc = useMemo(() => {
    if (petType === "dog") return "/illustrations/nervous-not.gif";
    if (petType === "cat") return "/illustrations/giphy.gif";
    return "/pet_profile.jpeg";
  }, [petType]);
  const petAvatarAlt = useMemo(() => {
    if (petType === "dog") return `Foto de ${petName}`;
    if (petType === "cat") return `Foto de ${petName}`;
    return `Foto de ${petName}`;
  }, [petName, petType]);
  const demoRecordedAtLabel = useMemo(() => {
    if (!demoRecordedAt) return null;
    const parsedAt = Date.parse(demoRecordedAt);
    if (!Number.isFinite(parsedAt)) return null;
    return chileCompactDatetime(new Date(parsedAt));
  }, [demoRecordedAt]);
  const demoSourceLabel = useMemo(() => {
    if (!demoSource) return null;
    if (demoSource === "trial_modal") return "Login";
    if (demoSource === "client") return "Cliente demo";
    return demoSource;
  }, [demoSource]);

  const stopGuideAudio = useCallback(() => {
    const audio = guideAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const closeGuide = useCallback(() => {
    setIsGuideVisible(false);
    setGuideStep(0);
    setGuideChoice(null);
    guideReplyHistoryRef.current = [];
    stopGuideAudio();
  }, [stopGuideAudio]);

  const guideSections = DEMO_SCREEN_CONTEXT.sections;

  useEffect(() => {
    if (!isGuideVisible) {
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
    if (!isGuideVisible) {
      return;
    }

    if (!isGuideCatAwake) {
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
    if (!isGuideVisible) {
      stopGuideAudio();
      return;
    }

    const audio = guideAudioRef.current;
    if (isGuideMuted) {
      stopGuideAudio();
    }

    let typingTimer: number | null = null;
    const line = guideReplyText.trim();

    if (!line) {
      setGuideTypedText("");
      setIsGuideTyping(false);
      return;
    }

    setGuideTypedText("");
    setIsGuideTyping(true);

    const startTyping = window.setTimeout(() => {
      if (audio && !isGuideMuted) {
        audio.loop = true;
        audio.volume = (0.24 + Math.random() * 0.05) * 0.85;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      }

      let charIndex = 0;
      typingTimer = window.setInterval(() => {
        charIndex += 1;
        setGuideTypedText(line.slice(0, charIndex));

        if (charIndex >= line.length) {
          if (typingTimer !== null) window.clearInterval(typingTimer);
          stopGuideAudio();
          setIsGuideTyping(false);
        }
      }, 28);
    }, 90);

    return () => {
      window.clearTimeout(startTyping);
      if (typingTimer !== null) window.clearInterval(typingTimer);
      stopGuideAudio();
      setIsGuideTyping(false);
    };
  }, [guideReplyText, isGuideMuted, isGuideVisible, stopGuideAudio]);

  const sendGuideMessage = useCallback(
    async (question: string) => {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion || isGuideSubmitting) return;

      setIsGuideSubmitting(true);
      setGuideDraft("");

      const controller = new AbortController();
      try {
        const reply = await fetchChatbotGatoResponse(
          {
            page: "demo",
            ownerName,
            petName,
            recentAssistantReplies: guideReplyHistoryRef.current.slice(0, 3),
            demoStep: guideStep,
            demoChoice: guideChoice,
            userMessage: trimmedQuestion,
          },
          controller.signal,
        );

        if (reply?.text) {
          setGuideReplyText(reply.text);
          guideReplyHistoryRef.current = [
            reply.text,
            ...guideReplyHistoryRef.current.filter(
              (line) => line !== reply.text,
            ),
          ].slice(0, 3);
        } else {
          setGuideReplyText("No voy a perder mi tiempo en responder eso.");
        }
      } catch {
        setGuideReplyText("No voy a perder mi tiempo en responder eso.");
      } finally {
        controller.abort();
        setIsGuideSubmitting(false);
      }
    },
    [guideChoice, guideStep, isGuideSubmitting, ownerName, petName],
  );

  const handleGuideSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const question = guideDraft.trim();
      if (!question) return;

      await sendGuideMessage(question);
    },
    [guideDraft, sendGuideMessage],
  );

  const guideComposer = (
    <div className="trial-rpg-composer-wrap">
      <form
        className="trial-rpg-composer"
        onSubmit={handleGuideSubmit}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <input
          type="text"
          value={guideDraft}
          onChange={(event) => setGuideDraft(event.target.value)}
          placeholder="Preguntame sobre Kittypau"
          className="trial-rpg-composer-input"
          autoComplete="off"
          disabled={isGuideSubmitting || isGuideTyping}
        />
        <button
          type="submit"
          className="trial-rpg-composer-button"
          disabled={
            isGuideSubmitting || isGuideTyping || guideDraft.trim().length === 0
          }
        >
          {isGuideSubmitting ? "..." : "Enviar"}
        </button>
      </form>
      <div className="trial-rpg-choices" aria-label="Preguntas rapidas">
        {DEMO_QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="trial-rpg-choice"
            disabled={isGuideSubmitting || isGuideTyping}
            onClick={() => {
              void sendGuideMessage(prompt);
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );

  const selectedMenu = (searchParams.get("menu") ?? "today") as
    | "today"
    | "story"
    | "pet"
    | "bowl";
  const renderedGuideCatEyeOffset =
    isGuideVisible && isGuideCatAwake ? guideCatEyeOffset : { x: 0, y: 0 };
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
      window.localStorage.removeItem("kittypau_demo_pet_type");
      window.localStorage.removeItem("kittypau_demo_device_id");
      window.localStorage.removeItem("kittypau_demo_show_rpg");
      window.localStorage.removeItem("kittypau_demo_email");
      window.localStorage.removeItem("kittypau_demo_kind");
      window.localStorage.removeItem("kittypau_demo_source");
      window.localStorage.removeItem("kittypau_demo_recorded_at");
    }
    router.push("/login");
  };

  return (
    <AppDataProvider>
      <div className="app-shell">
        <AppNav />
        <div className="app-content">
          <main className="min-h-screen px-4 py-4 md:px-6">
            {SHOW_GUIDE_DIALOG && isGuideVisible ? (
              <div
                className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-hidden px-3 py-3 sm:gap-4 sm:px-4 sm:py-8"
                role="dialog"
                aria-modal="true"
                onClick={(event) => {
                  if (event.target === event.currentTarget) closeGuide();
                }}
              >
                <TrialRpgDialogDock>
                  <TrialRpgDialog
                    dialogMode="demo"
                    typedText={guideTypedText}
                    isTyping={isGuideTyping}
                    isMuted={isGuideMuted}
                    onToggleMute={() => setIsGuideMuted((prev) => !prev)}
                    onClose={closeGuide}
                    onAdvance={() => {
                      if (guideStep === 0) {
                        setGuideStep(1);
                        return;
                      }
                      if (guideStep === 2) {
                        setGuideStep(3);
                        return;
                      }
                      if (guideStep === 3) {
                        closeGuide();
                      }
                    }}
                    catSvg={guideCatSvg ?? ""}
                    isCatAwake={isGuideCatAwake}
                    catEyeOffset={renderedGuideCatEyeOffset}
                    catRef={guideCatRef}
                    actions={guideComposer}
                  />
                </TrialRpgDialogDock>
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
                  Esta seccion se habilitara en proximas iteraciones del modo
                  prueba.
                </p>
              </section>
            ) : (
              <section className="mx-auto mt-1 w-full max-w-6xl rounded-[var(--radius)] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.4)] md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Image
                      src={petAvatarSrc}
                      alt={petAvatarAlt}
                      width={128}
                      height={128}
                      unoptimized
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
                      {petType ? (
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          Mascota: {petType === "dog" ? "Perro" : "Gato"}
                        </p>
                      ) : null}
                      {demoEmail || demoSource || demoRecordedAt ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
                          {demoEmail ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                              Correo: {demoEmail}
                            </span>
                          ) : null}
                          {demoSourceLabel ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                              Origen: {demoSourceLabel}
                            </span>
                          ) : null}
                          {demoRecordedAtLabel ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                              Registro: {demoRecordedAtLabel}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
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
              <p className="text-xs text-slate-400">
                Guia del gato:{" "}
                {guideSections.map((section) => section.label).join(" · ")}
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
