"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CSSProperties, FormEvent, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Parallax } from "react-scroll-parallax";
import TrialRpgDialogDock from "@/chatbot-gato/trial-rpg-dialog-dock";
import TrialRpgDialog from "@/chatbot-gato/trial-rpg-dialog";
import { fetchChatbotGatoResponse } from "@/chatbot-gato/client";
import { LOGIN_CHATBOT_CONTEXT } from "@/chatbot-gato/login-context";
import { buildChatbotRuntime } from "@/chatbot-gato/runtime";
import { resolveAuthenticatedPath, setTokens } from "@/lib/auth/token";
import { isNativeFlavorEnabled } from "@/lib/runtime/app-flavor";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import RegistroFlow from "@/app/(app)/registro/_components/registro-flow";
import SocialLinks from "@/app/_components/social-links";

export default function LoginPage() {
  const router = useRouter();
  const isNativeApk = isNativeFlavorEnabled();
  const SHOW_TRIAL_DIALOG = false;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trialButtonMessageIndex, setTrialButtonMessageIndex] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [verifiedMessage, setVerifiedMessage] = useState<string | null>(null);
  const [registerStep, setRegisterStep] = useState<"account" | "registro">(
    "account",
  );
  const [freshRegisterIntent, setFreshRegisterIntent] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerShowPassword, setRegisterShowPassword] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [registroProgress, setRegistroProgress] = useState(1);
  const [manualRegistroStep, setManualRegistroStep] = useState<number | null>(
    null,
  );
  const [registerConfirmed, setRegisterConfirmed] = useState(false);
  const [registerConfirmedMessage, setRegisterConfirmedMessage] = useState<
    string | null
  >(null);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const [heroBowlCycleIndex, setHeroBowlCycleIndex] = useState(0);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialOwnerName, setTrialOwnerName] = useState("");
  const [trialPetName, setTrialPetName] = useState("");
  const [trialEmail, setTrialEmail] = useState("");
  const [trialPetType, setTrialPetType] = useState<"dog" | "cat" | null>(null);
  const [hoveredTrialPetType, setHoveredTrialPetType] = useState<
    "dog" | "cat" | null
  >(null);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [isTrialDialogVisible, setIsTrialDialogVisible] = useState(false);
  const [trialDialogIndex, setTrialDialogIndex] = useState(0);
  const [trialDialogTypedText, setTrialDialogTypedText] = useState("");
  const [isTrialDialogTyping, setIsTrialDialogTyping] = useState(false);
  const [isTrialDialogMuted, setIsTrialDialogMuted] = useState(false);
  const [isDialogCatAwake, setIsDialogCatAwake] = useState(true);
  const [dialogCatEyeOffset, setDialogCatEyeOffset] = useState({ x: 0, y: 0 });
  const [isLoginCatHidden, setIsLoginCatHidden] = useState(false);
  const [isTrialCatAwake, setIsTrialCatAwake] = useState(false);
  const [catEyeOffset, setCatEyeOffset] = useState({ x: 0, y: 0 });
  const [aiTrialDialogReply, setAiTrialDialogReply] = useState<{
    key: string;
    lines: readonly string[];
  } | null>(null);
  const trialCatRef = useRef<HTMLDivElement | null>(null);
  const trialDialogCatRef = useRef<HTMLDivElement | null>(null);
  const trialBackgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const loginPanelWrapRef = useRef<HTMLDivElement | null>(null);
  const loginAudioRef = useRef<HTMLAudioElement | null>(null);
  const trialDialogAudioRef = useRef<HTMLAudioElement | null>(null);
  const registerTitle = useMemo(
    () => (registerStep === "account" ? "Crear cuenta" : "Registro Kittypau"),
    [registerStep],
  );

  const activeRegistroStep = manualRegistroStep ?? registroProgress;
  const modalStep =
    registerStep === "account" ? 1 : Math.min(4, activeRegistroStep + 1);
  const realRegistroStep = Math.min(4, Math.max(1, registroProgress));

  const accountCompleted =
    Boolean(confirmedEmail) || registerConfirmed || registerStep === "registro";
  const userCompleted = registerStep === "registro" && realRegistroStep >= 2;
  const petCompleted = registerStep === "registro" && realRegistroStep >= 3;
  const deviceCompleted = registerStep === "registro" && realRegistroStep >= 4;

  const completedMap: Record<number, boolean> = {
    1: accountCompleted,
    2: userCompleted,
    3: petCompleted,
    4: deviceCompleted,
  };

  const heroBowlCycle = [
    { image: "/illustrations/pink_food_full.png", soundGroup: "food" as const },
    {
      image: "/illustrations/pink_food_medium.png",
      soundGroup: "food" as const,
    },
    { image: "/illustrations/pink_empty.png", soundGroup: "food" as const },
    {
      image: "/illustrations/pink_water_full.png",
      soundGroup: "water" as const,
    },
    {
      image: "/illustrations/pink_water_medium.png",
      soundGroup: "water" as const,
    },
    { image: "/illustrations/pink_empty.png", soundGroup: "water" as const },
  ] as const;
  const currentHeroBowlState = heroBowlCycle[heroBowlCycleIndex];
  const heroFoodSoundFiles = [
    "/audio/comer_1.mp3",
    "/audio/comer_2.mp3",
    "/audio/comer_3.mp3",
  ] as const;
  const heroWaterSoundFiles = [
    "/audio/agua_1.mp3",
    "/audio/agua_2.mp3",
    "/audio/agua_3.mp3",
  ] as const;
  const loginRuntime = useMemo(
    () => buildChatbotRuntime({ page: "login" }),
    [],
  );
  const trialDialogRequestKey = useMemo(
    () =>
      [
        "login",
        showTrialModal ? "open" : "closed",
        trialOwnerName.trim(),
        trialPetName.trim(),
        trialEmail.trim().toLowerCase(),
      ].join(":"),
    [showTrialModal, trialEmail, trialOwnerName, trialPetName],
  );
  const trialDialogLines =
    aiTrialDialogReply?.key === trialDialogRequestKey
      ? aiTrialDialogReply.lines
      : [];
  const trialDialogIntro = loginRuntime.intro;
  const randomFrom = (arr: readonly string[]) =>
    arr[Math.floor(Math.random() * arr.length)];
  const playBowlClickSound = (group: "food" | "water") => {
    const soundSrc =
      group === "food"
        ? randomFrom(heroFoodSoundFiles)
        : randomFrom(heroWaterSoundFiles);
    const instance = new Audio(soundSrc);
    instance.preload = "auto";
    instance.currentTime = 0;
    void instance.play().catch(() => undefined);
  };
  const stopTrialDialogAudio = useCallback(() => {
    const audio = trialDialogAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const stopTrialBackgroundAudio = useCallback(() => {
    const audio = trialBackgroundAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const handleTrialMuteToggle = useCallback(() => {
    setIsTrialDialogMuted((prevMuted) => !prevMuted);
  }, []);

  useEffect(() => {
    if (!showTrialModal) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchChatbotGatoResponse(
        {
          page: "login",
          ownerName: trialOwnerName,
          petName: trialPetName,
          email: trialEmail,
          loginStep: 0,
        },
        controller.signal,
      )
        .then((reply) => {
          if (!reply || controller.signal.aborted) return;
          if (reply.lines.length) {
            setAiTrialDialogReply({
              key: trialDialogRequestKey,
              lines: reply.lines,
            });
            return;
          }
          setAiTrialDialogReply({
            key: trialDialogRequestKey,
            lines: loginRuntime.lines,
          });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setAiTrialDialogReply({
            key: trialDialogRequestKey,
            lines: loginRuntime.lines,
          });
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    loginRuntime.lines,
    showTrialModal,
    trialDialogRequestKey,
    trialEmail,
    trialOwnerName,
    trialPetName,
  ]);

  useEffect(() => {
    if (!showTrialModal || !isTrialDialogVisible) return;
    if (!isTrialDialogMuted) return;
    stopTrialDialogAudio();
  }, [
    isTrialDialogMuted,
    isTrialDialogVisible,
    showTrialModal,
    stopTrialDialogAudio,
  ]);

  useEffect(() => {
    const audio = trialBackgroundAudioRef.current;
    if (!audio) return;

    if (!showTrialModal || !isTrialDialogVisible) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    if (isTrialDialogMuted) {
      stopTrialBackgroundAudio();
      return;
    }

    if (audio.paused) {
      audio.loop = true;
      audio.volume = 0.28;
      void audio.play().catch(() => undefined);
    }
  }, [
    isTrialDialogMuted,
    isTrialDialogVisible,
    showTrialModal,
    stopTrialBackgroundAudio,
  ]);

  const wakeTrialCat = () => setIsTrialCatAwake(true);
  const sleepTrialCat = () => {
    setIsTrialCatAwake(false);
    setCatEyeOffset({ x: 0, y: 0 });
  };
  const updateCatEyesFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!isTrialCatAwake) return;
      const rect = trialCatRef.current?.getBoundingClientRect();
      if (!rect) return;
      const catCenterX = rect.left + rect.width * 0.46;
      const catCenterY = rect.top + rect.height * 0.46;
      const dx = clientX - catCenterX;
      const dy = clientY - catCenterY;
      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, value));

      // Movimiento sutil y centrado, dentro de rangos seguros.
      const subtleY = dy / 70 - 0.12;
      setCatEyeOffset({
        x: clamp(dx / 60, -0.95, 0.95),
        y: clamp(subtleY, -0.75, 0.45),
      });
    },
    [isTrialCatAwake],
  );
  const onTrialCatMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    updateCatEyesFromPoint(event.clientX, event.clientY);
  };
  const catWakeInteractions = {
    onMouseEnter: wakeTrialCat,
    onMouseLeave: sleepTrialCat,
    onFocus: wakeTrialCat,
    onBlur: sleepTrialCat,
  } as const;

  useEffect(() => {
    if (!isTrialCatAwake) return;

    const onWindowPointerMove = (event: PointerEvent) => {
      updateCatEyesFromPoint(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", onWindowPointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
    };
  }, [isTrialCatAwake, updateCatEyesFromPoint]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("kp-login-scrolled");
    return () => {
      root.classList.remove("kp-login-scrolled");
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTrialButtonMessageIndex((prev) => (prev + 1) % 2);
    }, 2600);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasPendingAuthFlow =
      params.get("register") === "1" ||
      params.get("reset") === "1" ||
      params.get("verified") === "1" ||
      Boolean(params.get("code")) ||
      Boolean(params.get("token_hash")) ||
      Boolean(params.get("type"));

    if (hasPendingAuthFlow) return;

    let cancelled = false;

    void resolveAuthenticatedPath().then((path) => {
      if (cancelled || !path) return;
      router.replace(path);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!showTrialModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsTrialDialogVisible(false);

      setTrialDialogIndex(0);

      setTrialDialogTypedText("");

      setIsTrialDialogTyping(false);
      setAiTrialDialogReply(null);

      setIsDialogCatAwake(true);

      setDialogCatEyeOffset({ x: 0, y: 0 });
      setIsLoginCatHidden(false);
      stopTrialDialogAudio();
      return;
    }

    const dialogDelayMs = 450;
    const hideCatBeforeDialogMs = 240;
    const hideDelay = Math.max(0, dialogDelayMs - hideCatBeforeDialogMs);

    const hideTimer = window.setTimeout(() => {
      setIsLoginCatHidden(true);
    }, hideDelay);

    const showTimer = window.setTimeout(() => {
      setIsTrialDialogVisible(true);
      setTrialDialogIndex(0);
      setTrialDialogTypedText("");
    }, dialogDelayMs);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [showTrialModal, stopTrialDialogAudio]);

  useEffect(() => {
    if (!showTrialModal || !isTrialDialogVisible) return;

    let sleepTimer: number | null = null;
    let wakeTimer: number | null = null;

    const scheduleNextMicroSleep = () => {
      const randomDelay = 4800 + Math.floor(Math.random() * 3600);
      sleepTimer = window.setTimeout(() => {
        setIsDialogCatAwake(false);
        wakeTimer = window.setTimeout(() => {
          setIsDialogCatAwake(true);
          scheduleNextMicroSleep();
        }, 1000);
      }, randomDelay);
    };

    scheduleNextMicroSleep();

    return () => {
      if (sleepTimer !== null) window.clearTimeout(sleepTimer);
      if (wakeTimer !== null) window.clearTimeout(wakeTimer);
      setIsDialogCatAwake(true);
    };
  }, [isTrialDialogVisible, showTrialModal]);

  useEffect(() => {
    if (!showTrialModal || !isTrialDialogVisible || !isDialogCatAwake) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDialogCatEyeOffset({ x: 0, y: 0 });
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = trialDialogCatRef.current?.getBoundingClientRect();
      if (!rect) return;
      const catCenterX = rect.left + rect.width * 0.46;
      const catCenterY = rect.top + rect.height * 0.46;
      const dx = event.clientX - catCenterX;
      const dy = event.clientY - catCenterY;
      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, value));

      setDialogCatEyeOffset({
        x: clamp(dx / 58, -0.95, 0.95),
        y: clamp(dy / 68 - 0.1, -0.74, 0.44),
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [isDialogCatAwake, isTrialDialogVisible, showTrialModal]);

  useEffect(() => {
    if (!showTrialModal || !isTrialDialogVisible) return;
    if (trialDialogIndex >= trialDialogLines.length) return;

    const line = trialDialogLines[trialDialogIndex];
    let pointer = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrialDialogTypedText("");

    setIsTrialDialogTyping(true);

    const audio = trialDialogAudioRef.current;
    if (audio && !isTrialDialogMuted) {
      audio.loop = true;
      audio.volume = (0.3 + Math.random() * 0.1) * 0.85;
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    }

    const typingTimer = window.setInterval(() => {
      pointer += 1;
      setTrialDialogTypedText(line.slice(0, pointer));
      if (pointer >= line.length) {
        window.clearInterval(typingTimer);
        stopTrialDialogAudio();
        setIsTrialDialogTyping(false);
      }
    }, 28);

    return () => {
      window.clearInterval(typingTimer);
      stopTrialDialogAudio();
      setIsTrialDialogTyping(false);
    };
  }, [
    isTrialDialogVisible,
    showTrialModal,
    trialDialogIndex,
    trialDialogLines,
    isTrialDialogMuted,
    stopTrialDialogAudio,
  ]);

  const stepMeta = useMemo(
    () => [
      { label: "Cuenta" },
      { label: "Usuario" },
      { label: "Mascota" },
      { label: "Dispositivo" },
    ],
    [],
  );

  const onStepperClick = (targetStep: number) => {
    if (targetStep <= 1) {
      setRegisterStep("account");
      setManualRegistroStep(null);
      return;
    }
    setRegisterStep("registro");
    setManualRegistroStep(Math.min(3, Math.max(1, targetStep - 1)));
  };

  const stepperContent = (
    <div className="login-stepper2" aria-label="Progreso del registro">
      <div className="login-stepper2-track" aria-hidden="true" />
      {stepMeta.map((step, idx) => {
        const number = idx + 1;
        const state = completedMap[number]
          ? "done"
          : number === modalStep
            ? "active"
            : "todo";
        return (
          <button
            key={step.label}
            type="button"
            onClick={() => onStepperClick(number)}
            className={`login-step2 login-step2-btn ${state}`}
            aria-current={number === modalStep ? "step" : undefined}
          >
            <span className="login-step2-dot" aria-hidden="true">
              {completedMap[number] ? "?" : number}
            </span>
            <span className="login-step2-label">{step.label}</span>
          </button>
        );
      })}
    </div>
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wantsRegister = params.get("register") === "1";
    const verified = params.get("verified") === "1";
    const resetDone = params.get("reset") === "1";

    const timer = window.setTimeout(() => {
      if (verified && wantsRegister) {
        // Resume the registration popup after email confirmation. We'll advance to step 2+
        // as soon as Supabase session becomes available (code/token_hash exchange or auth state change).
        setShowRegister(true);
        setFreshRegisterIntent(false);
      } else if (verified) {
        setVerifiedMessage("Cuenta verificada. Ya puedes iniciar sesión.");
      }
      if (resetDone) {
        setVerifiedMessage("Contraseña actualizada. Inicia sesión.");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Keep the popup in sync if the user confirms email in another tab/window.
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) return;

      setTokens({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
      setConfirmedEmail(session.user?.email ?? null);

      // If we're inside the registration popup, jump to step 2+.
      if (showRegister && registerStep === "account" && !freshRegisterIntent) {
        setRegisterStep("registro");
        setManualRegistroStep(null);
        setRegisterConfirmed(true);
        setRegisterConfirmedMessage(
          "Cuenta confirmada. Continuemos con tu perfil.",
        );
        setRegisterError(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [freshRegisterIntent, registerStep, showRegister]);

  useEffect(() => {
    // If the user already has a valid session (e.g., confirmed email in another tab),
    // jump directly to registration steps inside the same popup.
    if (!showRegister) return;
    if (registerStep !== "account") return;
    if (freshRegisterIntent) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let cancelled = false;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        const session = data.session;
        if (!session?.access_token) return;

        setTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        });
        setConfirmedEmail(session.user?.email ?? null);

        setRegisterStep("registro");
        setManualRegistroStep(null);
        setRegisterConfirmed(true);
        setRegisterConfirmedMessage(
          "Cuenta confirmada. Continuemos con tu perfil.",
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [freshRegisterIntent, registerStep, showRegister]);

  useEffect(() => {
    // Support Supabase PKCE confirmations: /login?code=...&register=1
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const wantsRegister = params.get("register") === "1";
    if (!code || !wantsRegister) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error || !data.session?.access_token) return;

        setTokens({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        });

        setShowRegister(true);
        setFreshRegisterIntent(false);
        setRegisterStep("registro");
        setManualRegistroStep(null);
        setRegisterConfirmed(true);
        setRegisterConfirmedMessage(
          "Cuenta confirmada. Continuemos con tu perfil.",
        );

        // Clean the URL (remove ?code=...) to avoid re-exchanging on reload.
        const next = new URL(window.location.href);
        next.searchParams.delete("code");
        next.searchParams.set("verified", "1");
        next.searchParams.set("register", "1");
        router.replace(next.pathname + "?" + next.searchParams.toString());
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    // Support Supabase non-PKCE confirmations: /login?token_hash=...&type=signup&register=1
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    const wantsRegister = params.get("register") === "1";
    if (!tokenHash || !type || !wantsRegister) return;

    if (
      type !== "signup" &&
      type !== "invite" &&
      type !== "magiclink" &&
      type !== "recovery"
    ) {
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          type: type as "signup" | "invite" | "magiclink" | "recovery",
          token_hash: tokenHash,
        });
        if (cancelled) return;
        if (error || !data.session?.access_token) return;

        setTokens({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        });
        setConfirmedEmail(data.session.user?.email ?? null);

        setShowRegister(true);
        setFreshRegisterIntent(false);
        setRegisterStep("registro");
        setRegisterConfirmed(true);
        setRegisterConfirmedMessage(
          "Cuenta confirmada. Continuemos con tu perfil.",
        );

        const next = new URL(window.location.href);
        next.searchParams.delete("token_hash");
        next.searchParams.delete("type");
        next.searchParams.set("verified", "1");
        next.searchParams.set("register", "1");
        router.replace(next.pathname + "?" + next.searchParams.toString());
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const emailValue = email.trim();
    const passwordValue = password.trim();
    if (!emailValue || !passwordValue) {
      setError("Completa email y contraseña para continuar.");
      setIsSubmitting(false);
      return;
    }
    if (!emailValue.includes("@")) {
      setError("Ingresa un email válido.");
      setIsSubmitting(false);
      return;
    }
    if (passwordValue.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setIsSubmitting(false);
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("kittypau_demo_mode");
      window.localStorage.removeItem("kittypau_demo_owner_name");
      window.localStorage.removeItem("kittypau_demo_pet_name");
      window.localStorage.removeItem("kittypau_demo_pet_type");
      window.localStorage.removeItem("kittypau_demo_device_id");
      window.localStorage.removeItem("kittypau_demo_email");
      window.localStorage.removeItem("kittypau_demo_kind");
      window.localStorage.removeItem("kittypau_demo_source");
      window.localStorage.removeItem("kittypau_demo_recorded_at");
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Faltan variables públicas de Supabase en el entorno.");
      setIsSubmitting(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: emailValue,
        password: passwordValue,
      },
    );

    if (signInError || !data.session?.access_token) {
      setError(signInError?.message ?? "No se pudo iniciar sesión.");
      setIsSubmitting(false);
      return;
    }

    setTokens({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });

    let targetPath = "/today";
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 2500);
      const accountRes = await fetch("/api/account/type", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      if (accountRes.ok) {
        const accountPayload = await accountRes.json();
        if (accountPayload?.account_type === "admin") {
          targetPath = "/admin";
        } else if (accountPayload?.account_type === "tester") {
          targetPath = "/today";
        }
      }
    } catch {
      // If account check fails, keep default route to Hoy.
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("kittypau_play_login_sound", "1");
    }

    router.push(targetPath);
    setIsSubmitting(false);
  };

  const onRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterError(null);
    setIsRegistering(true);
    if (!registerEmail || !registerPassword) {
      setRegisterError("Completa email y contraseña para continuar.");
      setIsRegistering(false);
      return;
    }
    if (registerPassword.length < 8) {
      setRegisterError("La contraseña debe tener al menos 8 caracteres.");
      setIsRegistering(false);
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setRegisterError("Faltan variables públicas de Supabase en el entorno.");
      setIsRegistering(false);
      return;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        emailRedirectTo: `${siteUrl}/login?register=1&verified=1`,
      },
    });

    if (signUpError) {
      setRegisterError(signUpError.message);
      setIsRegistering(false);
      return;
    }

    if (!data.session?.access_token) {
      setRegisterError(
        "Revisa tu correo (y spam) para confirmar la cuenta antes de continuar. Cuando confirmes, volverás aquí y pasaremos automáticamente al paso Usuario.",
      );
      setIsRegistering(false);
      return;
    }

    setTokens({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
    setConfirmedEmail(data.session.user?.email ?? null);
    setFreshRegisterIntent(false);
    setRegisterStep("registro");
    setManualRegistroStep(null);
    setIsRegistering(false);
  };

  const resendConfirmation = async () => {
    setRegisterError(null);
    setIsResending(true);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setRegisterError("Faltan variables públicas de Supabase en el entorno.");
      setIsResending(false);
      return;
    }
    if (!registerEmail) {
      setRegisterError("Ingresa un email para reenviar la confirmación.");
      setIsResending(false);
      return;
    }
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: registerEmail,
    });
    if (resendError) {
      setRegisterError(resendError.message);
    } else {
      setRegisterError("Te enviamos el correo de confirmación nuevamente.");
    }
    setIsResending(false);
  };

  const sendReset = async () => {
    setResetMessage(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setResetMessage("Faltan variables públicas de Supabase en el entorno.");
      return;
    }
    const targetEmail = resetEmail || email;
    if (!targetEmail) {
      setResetMessage("Ingresa un email válido.");
      return;
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      targetEmail,
      {
        redirectTo: `${siteUrl}/reset`,
      },
    );
    if (resetError) {
      setResetMessage(resetError.message);
      return;
    }
    setResetMessage("Te enviamos el correo de recuperación.");
  };

  const isEmailValid = email.includes("@");
  const isPasswordValid = password.length >= 8;
  const isLoginValid = isEmailValid && isPasswordValid;
  const isRegisterEmailValid = registerEmail.includes("@");
  const isRegisterPasswordValid = registerPassword.length >= 8;
  const isRegisterValid = isRegisterEmailValid && isRegisterPasswordValid;
  const canReset = Boolean(resetEmail || email);

  const openRegister = () => {
    setFreshRegisterIntent(true);
    setShowRegister(true);
    setRegisterStep("account");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterShowPassword(false);
    setRegisterError(null);
    setRegisterConfirmed(false);
    setRegisterConfirmedMessage(null);
    setConfirmedEmail(null);
    setRegistroProgress(1);
    setManualRegistroStep(null);
  };

  const closeRegister = () => {
    if (registerStep === "registro") {
      const ok = window.confirm(
        "¿Quieres cerrar el registro? Se guardará el progreso.",
      );
      if (!ok) return;
    }
    setShowRegister(false);
    setRegisterStep("account");
    setManualRegistroStep(null);
    setFreshRegisterIntent(false);
    setRegisterError(null);
  };

  const openTrial = () => {
    setTrialError(null);
    setTrialEmail((current) => current || email);
    setShowTrialModal(true);
  };

  const closeTrial = () => {
    setShowTrialModal(false);
    setTrialError(null);
    setTrialPetType(null);
    setHoveredTrialPetType(null);
    stopTrialBackgroundAudio();
  };

  const recordDemoIngreso = useCallback(
    (payload: {
      owner: string;
      pet: string;
      email: string;
      petType?: "dog" | "cat" | null;
    }) => {
      if (typeof window === "undefined") return;
      const body = {
        owner_name: payload.owner,
        pet_name: payload.pet,
        email: payload.email,
        pet_type: payload.petType ?? null,
        source: "trial_modal",
      };

      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(body)], {
            type: "application/json",
          });
          const ok = navigator.sendBeacon("/api/demo/ingreso", blob);
          if (ok) return;
        }
      } catch {
        // fall through to fetch
      }

      void fetch("/api/demo/ingreso", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => null);
    },
    [],
  );

  const startTrial = () => {
    const owner = trialOwnerName.trim();
    const pet = trialPetName.trim();
    const emailValue = trialEmail.trim().toLowerCase();
    const emailLooksValid =
      !emailValue || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
    if (!owner || !pet) {
      setTrialError("Ingresa tu nombre y el de tu mascota para continuar.");
      return;
    }
    if (!trialPetType) {
      setTrialError("Selecciona si tu mascota es perro o gato para continuar.");
      return;
    }
    if (!emailLooksValid) {
      setTrialError("Ingresa un correo válido o deja este campo vacío.");
      return;
    }

    // Best-effort logging for demo ingress (server-side audit_events).
    recordDemoIngreso({ owner, pet, email: emailValue, petType: trialPetType });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("kittypau_demo_mode", "1");
      window.localStorage.setItem("kittypau_demo_kind", "trial");
      window.localStorage.setItem("kittypau_demo_source", "trial_modal");
      window.localStorage.setItem(
        "kittypau_demo_recorded_at",
        new Date().toISOString(),
      );
      window.localStorage.setItem("kittypau_demo_owner_name", owner);
      window.localStorage.setItem("kittypau_demo_pet_name", pet);
      if (emailValue) {
        window.localStorage.setItem("kittypau_demo_email", emailValue);
      } else {
        window.localStorage.removeItem("kittypau_demo_email");
      }
      window.localStorage.setItem("kittypau_demo_pet_type", trialPetType);
      window.localStorage.setItem("kittypau_demo_show_rpg", "1");
      if (!window.localStorage.getItem("kittypau_demo_device_id")) {
        window.localStorage.setItem("kittypau_demo_device_id", "KPCL-DEMO");
      }
      // Reuse the same branded loading overlay (with sound) used after a real login.
      window.sessionStorage.setItem("kittypau_play_login_sound", "1");
    }
    closeTrial();
    router.push("/demo");
  };

  const onTrialDialogAdvance = useCallback(() => {
    if (!isTrialDialogVisible) return;
    if (!trialDialogLines.length) return;
    const lastIndex = trialDialogLines.length - 1;
    if (isTrialDialogTyping) {
      setTrialDialogTypedText(trialDialogLines[trialDialogIndex] ?? "");
      setIsTrialDialogTyping(false);
      stopTrialDialogAudio();
      return;
    }
    if (trialDialogIndex < lastIndex) {
      setTrialDialogIndex((prev) => Math.min(lastIndex, prev + 1));
      return;
    }
    window.open(
      "https://www.instagram.com/kittypau.mascotas/",
      "_blank",
      "noopener,noreferrer",
    );
  }, [
    isTrialDialogTyping,
    isTrialDialogVisible,
    stopTrialDialogAudio,
    trialDialogIndex,
    trialDialogLines,
  ]);

  // Key handling is implemented inside <TrialRpgDialog />.

  const trialCatSvg = `<svg width="45.952225mm" height="35.678726mm" viewBox="0 0 45.952225 35.678726" version="1.1" xmlns="http://www.w3.org/2000/svg"><g style="display:inline" transform="translate(-121.80376,-101.90461)"><path id="head" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 144.95859,104.74193 c 6.01466,-2.1201 14.02915,-0.85215 17.62787,2.77812 3.59872,3.63027 2.91927,7.6226 -0.0661,11.80703 -2.98542,4.18443 -9.54667,3.58363 -15.1474,3.43959 -5.60073,-0.14404 -10.30411,-0.0586 -11.67474,-3.9026 7.85671,-2.22341 3.24576,-12.00205 9.26042,-14.12214 z"/><path id="paw-front-right" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 156.30732,121.30486 c 0,0 -3.82398,2.52741 -4.14054,3.7997 -0.31656,1.2723 0.31438,2.18109 0.95701,2.55128 0.64264,0.3702 1.59106,-0.085 2.13559,-0.75306 0.54452,-0.6681 1.5629,-2.25488 2.47945,-3.20579 0.91654,-0.95091 2.96407,-2.74361 2.96407,-2.74361 l 0.73711,-3.60348 z"/><path id="paw-front-left" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 136.93356,123.08347 c 0,0 -3.20149,3.2804 -3.24123,4.59088 -0.0397,1.31049 0.60411,1.83341 1.3106,2.05901 0.7065,0.22559 1.60304,-0.55255 1.99363,-1.32084 0.39056,-0.76832 1.14875,-2.30337 2.04139,-3.29463 0.89264,-0.99126 3.37363,-3.37561 3.37363,-3.37561 l -1.30007,-3.61169 z"/><path id="paw-back" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 130.12859,121.60522 c -2.15849,1.92962 -3.38576,3.23532 -3.61836,4.5256 -0.23257,1.2903 0.0956,1.80324 0.76105,2.13059 0.66549,0.32733 1.66701,-0.31006 2.16665,-1.01233 0.49961,-0.70231 1.04598,-1.14963 2.83575,-3.05671 1.78977,-1.90708 5.91823,-3.27102 5.91823,-3.27102 l -0.75313,-3.99546 c 0,0 -5.15171,2.7497 -7.31019,4.67933 z"/><path style="display:inline;fill:#000000;stroke:none;stroke-width:0.292536;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:0.988235" id="path5" d="m 147.59927,113.85404 c 0.68896,4.40837 -4.04042,7.93759 -10.51533,8.9455 -6.47491,1.00791 -12.24344,-0.88717 -12.9324,-5.29555 -0.68895,-4.40838 3.44199,-9.94186 9.9169,-10.94977 6.47491,-1.0079 12.84186,2.89144 13.53083,7.29982 z"/><path id="ear-left" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 126.36446,111.82609 c 0,0 -2.37067,-6.28072 -0.86724,-7.10855 1.50342,-0.82783 5.87139,3.72617 5.87139,3.72617 z"/><path id="ear-right" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 143.50182,108.85407 c 0,0 -0.0544,-6.71302 -1.75519,-6.94283 -1.70081,-0.22982 -4.13211,5.59314 -4.13211,5.59314 z"/><g style="display:inline"><path style="fill:none;stroke:#000000;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 125.27102,116.06007 -2.97783,-1.05373"/><path style="fill:none;stroke:#000000;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 124.91643,116.80991 -2.84808,0.0754"/><path style="fill:none;stroke:#000000;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 124.97798,118.00308 -2.53111,0.5156"/></g><ellipse style="display:inline;fill:#ffffff;stroke:none;stroke-width:0.56967;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="142.61723" cy="108.6707" rx="3.0261719" ry="3.0757811" transform="rotate(1.8105864)"/><ellipse style="display:inline;fill:#000000;stroke:none;stroke-width:0.597086;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="112.57543" cy="138.29808" rx="1.0380507" ry="1.3097118" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="display:inline;fill:#f9f9f9;fill-opacity:1;stroke:none;stroke-width:0.184905;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="112.70263" cy="137.817" rx="0.32146212" ry="0.40558979" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="display:inline;fill:#ffffff;stroke:none;stroke-width:0.56967;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="135.40735" cy="110.12592" rx="3.0261719" ry="3.0757811" transform="rotate(1.8105864)"/><ellipse style="display:inline;fill:#000000;stroke:none;stroke-width:0.597086;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="105.22613" cy="138.07497" rx="1.0380507" ry="1.3097118" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="display:inline;fill:#f9f9f9;fill-opacity:1;stroke:none;stroke-width:0.184905;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="105.35332" cy="137.59389" rx="0.32146212" ry="0.40558979" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><path style="display:inline;fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 163.77708,109.27292 c 4.36563,2.71198 4.26447,17.63497 3.70417,21.03437 -0.5603,3.3994 -1.86906,4.06275 -4.53099,4.49791 -5.87463,0.96037 -8.39724,-5.87134 -5.7547,-5.72161 2.64254,0.14973 3.15958,3.46446 5.95314,2.05052 2.79356,-1.41394 -1.42214,-13.46068 -1.42214,-13.46068 z" id="tail"/><g id="lefteyelid" style="display:inline"><ellipse style="fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="131.94429" cy="114.29948" rx="3.1571214" ry="3.2155864"/><path style="fill:#000000;fill-opacity:1;stroke:#ffffff;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 129.32504,114.80228 c 2.54908,-1.14592 4.60706,-0.65481 4.60706,-0.65481"/></g><g id="righteyelid" style="display:inline"><ellipse style="fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="139.07704" cy="113.0834" rx="3.1571214" ry="3.2155864"/><path style="fill:#000000;fill-opacity:1;stroke:#ffffff;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 136.48089,113.70683 c 2.48528,-1.2784 4.56624,-0.89621 4.56624,-0.89621"/></g><g id="eyesdown"><ellipse style="fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="139.12122" cy="113.61373" rx="1.8686198" ry="2.0422525"/><ellipse style="fill:#000000;stroke:none;stroke-width:0.597086;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="112.24622" cy="139.77037" rx="1.0380507" ry="1.3097118" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="fill:#f9f9f9;fill-opacity:1;stroke:none;stroke-width:0.184905;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="112.37342" cy="139.28929" rx="0.32146212" ry="0.40558979" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="131.994" cy="114.92011" rx="1.8686198" ry="2.0422525"/><ellipse style="fill:#000000;stroke:none;stroke-width:0.597086;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="105.00267" cy="139.64998" rx="1.0380507" ry="1.3097118" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="fill:#f9f9f9;fill-opacity:1;stroke:none;stroke-width:0.184905;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="105.12987" cy="139.1689" rx="0.32146212" ry="0.40558979" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/></g><path id="longtail" style="display:inline;fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 164.24062,110.09354 -2.10788,6.5381 c 0,0 0.84017,12.88397 0.35269,20.95169 h 4.78291 c 0.83489,-8.63528 0.13334,-24.78453 -3.02772,-27.48979 z"/></g></svg>`;

  return (
    <div
      className="login-bg login-ui-font"
      data-kp-parallax-container={isNativeApk ? undefined : "1"}
    >
      <div className="login-layer">
        <div className="login-collage" />
      </div>
      <audio ref={loginAudioRef} src="/audio/sonido_marca.mp3" preload="auto" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center justify-center gap-6 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:py-2">
        {!isNativeApk ? (
          <div className="login-hero-column max-w-xl space-y-4 text-center">
            <div className="login-fold-box login-fold-box-plate">
              <Parallax
                translateY={
                  isNativeApk
                    ? ["22px", "-28px", "easeOutQuad"]
                    : ["14px", "-18px", "easeOutQuad"]
                }
                rotate={isNativeApk ? ["-1deg", "1deg"] : ["0deg", "0deg"]}
                shouldAlwaysCompleteAnimation
                disabled={isNativeApk}
              >
                <div className="login-hero-asset freeform-rise">
                  <button
                    type="button"
                    onClick={() => {
                      const nextIndex =
                        (heroBowlCycleIndex + 1) % heroBowlCycle.length;
                      const nextState = heroBowlCycle[nextIndex];
                      playBowlClickSound(nextState.soundGroup);
                      setHeroBowlCycleIndex(nextIndex);
                    }}
                    className="group mx-auto inline-flex w-full cursor-pointer items-center justify-center appearance-none border-0 bg-transparent p-0"
                    aria-label="Cambiar nivel visual del plato"
                    title="Cambiar nivel visual del plato"
                    {...catWakeInteractions}
                  >
                    <Image
                      src={currentHeroBowlState.image}
                      alt="Plato de comida Kittypau"
                      width={240}
                      height={240}
                      className="login-hero-asset-img mx-auto select-none transition-transform duration-150 ease-out group-hover:scale-95 group-active:scale-90"
                      loading="eager"
                      draggable={false}
                    />
                  </button>
                </div>
              </Parallax>
            </div>
            <div className="login-hero-divider" aria-hidden="true" />
            <Parallax
              translateY={isNativeApk ? undefined : ["8px", "-16px"]}
              opacity={isNativeApk ? undefined : [0.95, 1]}
              disabled={isNativeApk}
              shouldAlwaysCompleteAnimation
            >
              <div className="login-fold-box login-fold-box-message">
                <p className="login-hero-static text-slate-700">
                  Descubre lo que tu mascota intenta decirte.
                </p>
                <div className="login-hero-slider" aria-live="polite">
                  <div className="login-hero-slider-viewport scroller">
                    <div className="login-hero-slider-track inner">
                      <p>Monitorea ciclos de comida y agua</p>
                      <p>Recibe alertas tempranas de salud</p>
                      <p>Tenencia responsable y tecnología</p>
                      <p>Bienestar Animal - IA - IoT</p>
                    </div>
                  </div>
                </div>
              </div>
            </Parallax>
            <Parallax
              translateY={isNativeApk ? undefined : ["10px", "-18px"]}
              opacity={isNativeApk ? undefined : [0.92, 1]}
              disabled={isNativeApk}
              shouldAlwaysCompleteAnimation
            >
              <div className="login-fold-box login-fold-box-brand login-card-brand freeform-rise">
                <div className="brand-logo-badge" aria-hidden="true">
                  <Image
                    src="/logo_carga.jpg"
                    alt=""
                    width={96}
                    height={96}
                    priority
                    className="brand-logo-img"
                    draggable={false}
                  />
                </div>
                <span className="brand-title text-3xl text-primary">
                  Kittypau
                </span>
                <p className="kp-pettech-tagline mt-1">PetTech AIoT</p>
              </div>
            </Parallax>
            <SocialLinks
              className="login-hero-social login-hero-social-web social-header"
              size="md"
              onInteractionStart={wakeTrialCat}
              onInteractionEnd={sleepTrialCat}
            />
          </div>
        ) : null}

        <div className="login-auth-column w-full max-w-md">
          <div className="login-card-brand freeform-rise">
            <div className="login-brand-core">
              <div className="brand-logo-badge" aria-hidden="true">
                <Image
                  src="/logo_carga.jpg"
                  alt=""
                  width={96}
                  height={96}
                  priority
                  className="brand-logo-img"
                  draggable={false}
                />
              </div>
              <span className="brand-title text-3xl text-primary">
                Kittypau
              </span>
              <p className="kp-pettech-tagline mt-1">PetTech AIoT</p>
            </div>
          </div>

          <div
            className="login-panel-wrap login-deferred-panel"
            ref={loginPanelWrapRef}
          >
            <div className="glass-panel freeform-rise relative w-full p-5">
              <div
                className="stagger login-login-stack"
                onMouseMove={onTrialCatMouseMove}
              >
                <div className="login-login-head flex items-center justify-center gap-3">
                  <h2 className="display-title w-full whitespace-nowrap text-center text-[1.35rem] font-semibold leading-[1.05] text-slate-700">
                    Iniciar sesión
                  </h2>
                </div>
                {!isNativeApk ? (
                  <div
                    className={`kp-trial-cat login-panel-cat mouse-detector shrink-0${
                      isTrialCatAwake ? " is-awake" : ""
                    }${isLoginCatHidden ? " login-panel-cat-hidden" : ""}`}
                    ref={trialCatRef}
                    onMouseEnter={wakeTrialCat}
                    onMouseLeave={sleepTrialCat}
                    style={
                      {
                        "--cat-eye-x": `${catEyeOffset.x}px`,
                        "--cat-eye-y": `${catEyeOffset.y}px`,
                        opacity: isLoginCatHidden ? 0 : 1,
                        visibility: isLoginCatHidden ? "hidden" : "visible",
                        transform: isLoginCatHidden
                          ? "translateY(8px) scale(0.98)"
                          : "translateY(0) scale(1)",
                      } as CSSProperties
                    }
                  >
                    <div className="cat">
                      <div className="sleep-symbol" aria-hidden="true">
                        <span className="z z1">Z</span>
                        <span className="z z2">z</span>
                        <span className="z z3">Z</span>
                      </div>
                      <div
                        className="thecat"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: trialCatSvg }}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="login-login-intro">
                  <p className="text-center text-[0.95rem] font-medium leading-snug text-slate-600">
                    Accede a la actividad de tu plato.
                  </p>
                </div>
                <form
                  className="login-login-form login-form-compact"
                  onSubmit={onSubmit}
                  aria-busy={isSubmitting}
                >
                  <div className="space-y-2">
                    <label
                      className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500"
                      htmlFor="login-email"
                    >
                      Email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        wakeTrialCat();
                      }}
                      onFocus={wakeTrialCat}
                      onBlur={sleepTrialCat}
                      className="h-10 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                      aria-invalid={
                        Boolean(error) || (email.length > 0 && !isEmailValid)
                      }
                      autoComplete="email"
                    />
                    {email.length > 0 && !isEmailValid ? (
                      <p className="text-[11px] text-rose-600">
                        Ingresa un email válido.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500"
                      htmlFor="login-password"
                    >
                      Contraseña
                    </label>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        wakeTrialCat();
                      }}
                      onFocus={wakeTrialCat}
                      onBlur={sleepTrialCat}
                      className="h-10 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                      aria-invalid={
                        Boolean(error) ||
                        (password.length > 0 && !isPasswordValid)
                      }
                      autoComplete="current-password"
                    />
                    {password.length > 0 && !isPasswordValid ? (
                      <p className="text-[11px] text-rose-600">
                        Usa mínimo 8 caracteres.
                      </p>
                    ) : null}
                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={showPassword}
                        onChange={(event) =>
                          setShowPassword(event.target.checked)
                        }
                        onFocus={wakeTrialCat}
                        onBlur={sleepTrialCat}
                      />
                      Mostrar contraseña
                    </label>
                  </div>
                  {verifiedMessage ? (
                    <p className="rounded-[var(--radius)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {verifiedMessage}
                    </p>
                  ) : null}
                  {error ? (
                    <p
                      className="rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                      role="alert"
                      aria-live="polite"
                    >
                      {error}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={isSubmitting || !isLoginValid}
                    className="login-submit-button h-10 w-full rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                    {...catWakeInteractions}
                  >
                    {isSubmitting ? "Conectando..." : "Continuar"}
                  </button>
                  {isSubmitting ? (
                    <p className="text-[11px] text-slate-500">
                      Verificando credenciales...
                    </p>
                  ) : null}
                </form>

                <div className="login-trial-inline mt-4">
                  <button
                    type="button"
                    onClick={openTrial}
                    className="kp-trial-button"
                    aria-label="Abrir Demo App. No necesitas registrarte."
                    title="Demo App - No necesitas registrarte"
                    {...catWakeInteractions}
                  >
                    <span className="kp-trial-button-main brand-title">
                      Demo App
                    </span>
                    <span
                      className={`kp-trial-button-note ${
                        trialButtonMessageIndex === 0
                          ? "is-visible"
                          : "is-hidden"
                      }`}
                    >
                      Pruébala ahora
                    </span>
                    <span
                      className={`kp-trial-button-note kp-trial-button-note-accent ${
                        trialButtonMessageIndex === 1
                          ? "is-visible"
                          : "is-hidden"
                      }`}
                    >
                      No Necesitas Registrarte !!
                    </span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <button
                    type="button"
                    className="login-forgot-button hover:text-slate-900"
                    onClick={() => setShowReset((prev) => !prev)}
                    disabled={isSubmitting}
                    {...catWakeInteractions}
                  >
                    Olvidé mi clave
                  </button>
                  <button
                    type="button"
                    className="login-create-button rounded-full px-2 py-1 transition hover:text-slate-900"
                    onClick={openRegister}
                    {...catWakeInteractions}
                  >
                    Crear cuenta
                  </button>
                </div>
                {showReset ? (
                  <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">
                      Recuperar contraseña
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Enviaremos un enlace al correo asociado.
                    </p>
                    <input
                      type="email"
                      className="mt-3 w-full rounded-[calc(var(--radius)-8px)] border border-slate-200 px-3 py-2 text-xs text-slate-700"
                      placeholder="correo@ejemplo.com"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      autoComplete="email"
                    />
                    <button
                      type="button"
                      onClick={sendReset}
                      disabled={!canReset}
                      className="mt-3 w-full rounded-[calc(var(--radius)-8px)] border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                      {...catWakeInteractions}
                    >
                      Enviar enlace
                    </button>
                    {resetMessage ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        {resetMessage}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <SocialLinks
            className="login-auth-social social-header-center"
            size="md"
            onInteractionStart={wakeTrialCat}
            onInteractionEnd={sleepTrialCat}
          />
        </div>
      </div>

      {showRegister ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-10">
          <div className="relative w-full max-w-4xl sm:px-0">
            <div
              className={`glass-panel login-register-modal w-full overflow-hidden ${
                registerStep === "registro"
                  ? "login-register-modal-registro"
                  : ""
              }`}
            >
              <div className="login-register-head border-b border-white/30 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Registro
                    </p>
                    <h2 className="display-title text-2xl font-semibold text-slate-900">
                      {registerTitle}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="login-register-pill text-xs font-semibold">
                      Paso {modalStep} / 4
                    </span>
                    <button
                      type="button"
                      onClick={closeRegister}
                      className="rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {stepperContent}
                  {registerStep === "account" &&
                  registerConfirmed &&
                  registerConfirmedMessage ? (
                    <p className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      {registerConfirmedMessage}
                    </p>
                  ) : null}
                </div>
              </div>
              <div
                className={`login-register-body ${
                  registerStep === "account"
                    ? "p-6"
                    : "login-register-body-registro"
                }`}
              >
                {registerStep === "account" ? (
                  <form
                    className="space-y-4"
                    onSubmit={onRegister}
                    aria-busy={isRegistering}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="tu@email.com"
                          value={registerEmail}
                          onChange={(event) =>
                            setRegisterEmail(event.target.value)
                          }
                          className="h-11 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                          Contraseña
                        </label>
                        <input
                          type={registerShowPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={registerPassword}
                          onChange={(event) =>
                            setRegisterPassword(event.target.value)
                          }
                          className="h-11 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                        />
                        {registerPassword.length > 0 &&
                        !isRegisterPasswordValid ? (
                          <p className="text-[11px] text-rose-600">
                            Debe tener 8 caracteres o más.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={registerShowPassword}
                        onChange={(event) =>
                          setRegisterShowPassword(event.target.checked)
                        }
                      />
                      Mostrar contraseña
                    </label>
                    {registerEmail.length > 0 && !isRegisterEmailValid ? (
                      <p className="text-[11px] text-rose-600">
                        Ingresa un email válido.
                      </p>
                    ) : null}
                    {registerError ? (
                      <p
                        className="rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                        role="alert"
                      >
                        {registerError}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={isRegistering || !isRegisterValid}
                      className="h-11 w-full rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isRegistering ? "Creando..." : "Continuar"}
                    </button>
                    {isRegistering ? (
                      <p className="text-[11px] text-slate-500">
                        Creando cuenta...
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={resendConfirmation}
                        disabled={isResending || isRegistering}
                        className="font-semibold text-slate-600 hover:text-slate-900"
                      >
                        {isResending
                          ? "Reenviando..."
                          : "Reenviar confirmación"}
                      </button>
                      <button
                        type="button"
                        onClick={closeRegister}
                        className="font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Volver al login
                      </button>
                    </div>
                  </form>
                ) : (
                  <RegistroFlow
                    mode="modal"
                    onClose={closeRegister}
                    forcedStep={manualRegistroStep}
                    onProgress={(step) => {
                      setRegistroProgress(step);
                      if (
                        manualRegistroStep !== null &&
                        step !== manualRegistroStep
                      ) {
                        setManualRegistroStep(null);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showTrialModal ? (
        <div
          className="login-trial-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-hidden px-3 py-3 sm:gap-4 sm:px-4 sm:py-8"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeTrial();
          }}
        >
          <div
            className={`login-trial-modal-host relative w-full max-w-lg${
              isTrialDialogVisible ? " login-trial-modal-host--dialog-open" : ""
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="login-register-modal login-trial-modal glass-panel w-full rounded-[var(--radius)] p-3 sm:p-5">
              <div className="mb-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <p className="login-trial-eyebrow brand-title text-[0.88rem] font-semibold uppercase tracking-[0.18em]">
                      Modo prueba
                    </p>
                    <h2 className="login-trial-title text-[0.96rem] font-semibold">
                      {trialDialogIntro.title}
                    </h2>
                    {trialDialogIntro.body ? (
                      <p className="login-trial-copy mt-0.5 text-[0.75rem]">
                        {trialDialogIntro.body}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <span className="login-trial-label text-[0.62rem] font-medium uppercase tracking-[0.12em]">
                    Cuál es tu mascota?
                  </span>
                  <div className="flex gap-4">
                    {[
                      {
                        type: "dog" as const,
                        label: "Perro",
                        src: "/illustrations/nervous-not.gif",
                      },
                      {
                        type: "cat" as const,
                        label: "Gato",
                        src: "/illustrations/giphy.gif",
                      },
                    ].map((option) => {
                      const isSelected = trialPetType === option.type;
                      const isHovered = hoveredTrialPetType === option.type;
                      return (
                        <div
                          key={option.type}
                          className="relative flex flex-col items-center gap-1"
                        >
                          <button
                            type="button"
                            onClick={() => setTrialPetType(option.type)}
                            onMouseEnter={() =>
                              setHoveredTrialPetType(option.type)
                            }
                            onMouseLeave={() => setHoveredTrialPetType(null)}
                            aria-label={option.label}
                            className={`group relative z-10 mx-auto flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-full border-2 bg-white transition sm:h-[6.2rem] sm:w-[6.2rem] ${
                              isSelected
                                ? "border-emerald-500 shadow-[0_12px_30px_-16px_rgba(34,197,94,0.4)]"
                                : isHovered
                                  ? "border-emerald-400 shadow-[0_8px_24px_-20px_rgba(34,197,94,0.24)]"
                                  : "border-[color-mix(in_oklab,hsl(var(--border))_78%,_#ffffff)] shadow-[0_8px_24px_-20px_rgba(15,23,42,0.18)] hover:border-emerald-300"
                            }`}
                            aria-pressed={isSelected}
                          >
                            <img
                              src={option.src}
                              alt=""
                              aria-hidden="true"
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                            />
                          </button>
                          <span className="text-[0.82rem] font-semibold leading-none text-slate-700">
                            {option.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <label className="block space-y-1">
                  <span className="login-trial-label text-[0.62rem] font-medium uppercase tracking-[0.12em]">
                    Tu nombre
                  </span>
                  <input
                    type="text"
                    value={trialOwnerName}
                    onChange={(event) => setTrialOwnerName(event.target.value)}
                    className="login-trial-input h-9 w-full rounded-[var(--radius)] border px-3 text-[0.82rem] outline-none focus:ring-2"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="login-trial-label text-[0.62rem] font-medium uppercase tracking-[0.12em]">
                    Nombre de tu mascota
                  </span>
                  <input
                    type="text"
                    value={trialPetName}
                    onChange={(event) => setTrialPetName(event.target.value)}
                    className="login-trial-input h-9 w-full rounded-[var(--radius)] border px-3 text-[0.82rem] outline-none focus:ring-2"
                  />
                </label>
              </div>

              {trialError ? (
                <p className="login-trial-error mt-3 rounded-[var(--radius)] border px-3 py-2 text-xs">
                  {trialError}
                </p>
              ) : null}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeTrial}
                  className="login-trial-cancel rounded-[var(--radius)] border px-3 py-2 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={startTrial}
                  className="login-trial-submit rounded-[var(--radius)] px-4 py-2 text-xs font-semibold"
                >
                  {LOGIN_CHATBOT_CONTEXT.modal.primaryCta}
                </button>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-center">
                <a
                  href="https://www.instagram.com/kittypau.mascotas/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[#E1306C]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-[#E1306C]"
                    fill="currentColor"
                  >
                    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.5 1.5h-8.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.38a1.13 1.13 0 1 1 0 2.26 1.13 1.13 0 0 1 0-2.26Z" />
                  </svg>
                  <span>Síguenos en Instagram</span>
                </a>
              </div>
            </div>
          </div>
          {SHOW_TRIAL_DIALOG && isTrialDialogVisible ? (
            <TrialRpgDialogDock>
              <div className="login-trial-dialog-scene">
                <TrialRpgDialog
                  dialogMode="login"
                  typedText={trialDialogTypedText}
                  isTyping={isTrialDialogTyping}
                  isMuted={isTrialDialogMuted}
                  onToggleMute={handleTrialMuteToggle}
                  onClose={closeTrial}
                  onAdvance={onTrialDialogAdvance}
                  catSvg={trialCatSvg}
                  isCatAwake={isDialogCatAwake}
                  catEyeOffset={dialogCatEyeOffset}
                  catRef={trialDialogCatRef}
                  actions={
                    <a
                      href="https://www.instagram.com/kittypau.mascotas/"
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-2 rounded-[var(--radius)] border border-border/70 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-white trial-rpg-instagram ${
                        trialDialogIndex === trialDialogLines.length - 1 &&
                        !isTrialDialogTyping
                          ? "is-visible"
                          : "is-hidden"
                      }`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 text-[#E1306C]"
                        fill="currentColor"
                      >
                        <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.5 1.5h-8.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.38a1.13 1.13 0 1 1 0 2.26 1.13 1.13 0 0 1 0-2.26Z" />
                      </svg>
                      <span>Síguenos en Instagram</span>
                    </a>
                  }
                />
              </div>
            </TrialRpgDialogDock>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
