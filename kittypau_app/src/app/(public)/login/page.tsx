"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { setTokens } from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import RegistroFlow from "@/app/(app)/registro/_components/registro-flow";
import SocialLinks from "@/app/_components/social-links";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [verifiedMessage, setVerifiedMessage] = useState<string | null>(null);
  const [registerStep, setRegisterStep] = useState<"account" | "registro">(
    "account"
  );
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerShowPassword, setRegisterShowPassword] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [highlightRegister, setHighlightRegister] = useState(false);
  const [registroProgress, setRegistroProgress] = useState(1);
  const [manualRegistroStep, setManualRegistroStep] = useState<number | null>(null);
  const [registerConfirmed, setRegisterConfirmed] = useState(false);
  const [registerConfirmedMessage, setRegisterConfirmedMessage] = useState<string | null>(null);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const [heroFoodState, setHeroFoodState] = useState<"full" | "medium" | "empty">("full");
  const loginAudioRef = useRef<HTMLAudioElement | null>(null);
  const registerTitle = useMemo(
    () => (registerStep === "account" ? "Crear cuenta" : "Registro Kittypau"),
    [registerStep]
  );

  const activeRegistroStep = manualRegistroStep ?? registroProgress;
  const modalStep = registerStep === "account" ? 1 : Math.min(4, activeRegistroStep + 1);
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

  const heroFoodImageByState: Record<"full" | "medium" | "empty", string> = {
    full: "/illustrations/pink_food_full.png",
    medium: "/illustrations/pink_food_medium.png",
    empty: "/illustrations/pink_empty.png",
  };
  const nextHeroFoodState: Record<"full" | "medium" | "empty", "full" | "medium" | "empty"> = {
    full: "medium",
    medium: "empty",
    empty: "medium",
  };

  const stepMeta = useMemo(
    () => [
      { label: "Cuenta" },
      { label: "Usuario" },
      { label: "Mascota" },
      { label: "Dispositivo" },
    ],
    []
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

  const Stepper = () => (
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
              {completedMap[number] ? "✓" : number}
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

    if (verified && wantsRegister) {
      // Resume the registration popup after email confirmation. We'll advance to step 2+
      // as soon as Supabase session becomes available (code/token_hash exchange or auth state change).
      setShowRegister(true);
    } else if (verified) {
      setVerifiedMessage("Cuenta verificada. Ya puedes iniciar sesión.");
    }
    if (params.get("reset") === "1") {
      setVerifiedMessage("Contraseña actualizada. Inicia sesión.");
    }
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
      if (showRegister && registerStep === "account") {
        setRegisterStep("registro");
        setManualRegistroStep(null);
        setRegisterConfirmed(true);
        setRegisterConfirmedMessage("Cuenta confirmada. Continuemos con tu perfil.");
        setRegisterError(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [registerStep, showRegister]);

  useEffect(() => {
    // If the user already has a valid session (e.g., confirmed email in another tab),
    // jump directly to registration steps inside the same popup.
    if (!showRegister) return;
    if (registerStep !== "account") return;

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
        setRegisterConfirmedMessage("Cuenta confirmada. Continuemos con tu perfil.");
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [registerStep, showRegister]);

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
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error || !data.session?.access_token) return;

        setTokens({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        });

        setShowRegister(true);
        setRegisterStep("registro");
        setManualRegistroStep(null);
        setRegisterConfirmed(true);
        setRegisterConfirmedMessage("Cuenta confirmada. Continuemos con tu perfil.");

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

    if (type !== "signup" && type !== "invite" && type !== "magiclink" && type !== "recovery") {
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
        setRegisterStep("registro");
        setRegisterConfirmed(true);
        setRegisterConfirmedMessage("Cuenta confirmada. Continuemos con tu perfil.");

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
    if (!email || !password) {
      setError("Completa email y password para continuar.");
      setIsSubmitting(false);
      return;
    }
    if (!email.includes("@")) {
      setError("Ingresa un email válido.");
      setIsSubmitting(false);
      return;
    }
    if (password.length < 8) {
      setError("El password debe tener al menos 8 caracteres.");
      setIsSubmitting(false);
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Faltan variables públicas de Supabase en el entorno.");
      setIsSubmitting(false);
      return;
    }

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
      const adminRes = await fetch("/api/admin/access", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (adminRes.ok) {
        const adminPayload = await adminRes.json();
        if (adminPayload?.is_admin === true) {
          targetPath = "/admin";
        }
      }
    } catch {
      // If admin check fails, keep default user route.
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("kittypau_play_login_sound", "1");
    }

    router.push(targetPath);
  };

  const onRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterError(null);
    setIsRegistering(true);
    if (!registerEmail || !registerPassword) {
      setRegisterError("Completa email y password para continuar.");
      setIsRegistering(false);
      return;
    }
    if (registerPassword.length < 8) {
      setRegisterError("El password debe tener al menos 8 caracteres.");
      setIsRegistering(false);
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setRegisterError("Faltan variables públicas de Supabase en el entorno.");
      setIsRegistering(false);
      return;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

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
        "Revisa tu correo (y spam) para confirmar la cuenta antes de continuar. Cuando confirmes, volverás aquí y pasaremos automáticamente al paso Usuario."
      );
      setIsRegistering(false);
      return;
    }

    setTokens({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
    setConfirmedEmail(data.session.user?.email ?? null);
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
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      targetEmail,
      {
        redirectTo: `${siteUrl}/reset`,
      }
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
    setShowRegister(true);
    setRegisterStep("account");
    setRegisterError(null);
    setRegisterConfirmed(false);
    setRegisterConfirmedMessage(null);
    setConfirmedEmail(null);
    setRegistroProgress(1);
    setManualRegistroStep(null);
  };

  const closeRegister = () => {
    if (registerStep === "registro") {
      const ok = window.confirm("¿Quieres cerrar el registro? Se guardará el progreso.");
      if (!ok) return;
    }
    setShowRegister(false);
    setRegisterStep("account");
    setManualRegistroStep(null);
    setRegisterError(null);
  };

  return (
    <div className="login-bg">
      <div className="login-layer">
        <div className="login-collage" />
      </div>
      <audio ref={loginAudioRef} src="/audio/sonido_marca.mp3" preload="auto" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center justify-center gap-6 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:py-2">
        <div className="login-hero-column max-w-xl space-y-4 text-center">
          <div className="login-hero-asset freeform-rise freeform-float">
            <button
              type="button"
              onClick={() => setHeroFoodState((prev) => nextHeroFoodState[prev])}
              className="group cursor-pointer appearance-none border-0 bg-transparent p-0"
              aria-label="Cambiar nivel visual del plato"
              title="Cambiar nivel visual del plato"
            >
              <img
                src={heroFoodImageByState[heroFoodState]}
                alt="Plato de comida Kittypau"
                className="login-hero-asset-img select-none transition-transform duration-150 ease-out group-hover:scale-95 group-active:scale-90"
                loading="eager"
                draggable={false}
              />
            </button>
          </div>
          <h1 className="login-hero-title display-title text-4xl font-semibold leading-[1.1] text-slate-900 md:text-5xl">
            Tu plato inteligente, tu historia diaria.
          </h1>
          <p className="login-hero-copy text-base leading-relaxed text-slate-600 md:text-lg">
            Accede a la lectura interpretada del comportamiento de tu mascota.
            Sin dashboards fríos, solo claridad y calma.
          </p>
        </div>

        <div className="login-auth-column w-full max-w-md">
          <div className="login-card-brand freeform-rise">
            <div className="brand-logo-badge" aria-hidden="true">
              <img
                src="/logo_carga.jpg"
                alt=""
                className="brand-logo-img"
                draggable={false}
              />
            </div>
            <span className="brand-title text-3xl text-primary">Kittypau</span>
            <SocialLinks className="social-header social-header-center" size="md" />
          </div>

          <div className="login-panel-wrap">
            <div className="glass-panel freeform-rise w-full p-7">
              <div className="stagger login-login-stack">
                <div>
                  <h2 className="display-title text-2xl font-semibold text-slate-900">
                    Iniciar sesión
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Usa tu correo para ver el estado de tu plato.
                  </p>
                </div>

              <form className="login-login-form" onSubmit={onSubmit} aria-busy={isSubmitting}>
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
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                    aria-invalid={Boolean(error) || (email.length > 0 && !isEmailValid)}
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
                    Password
                  </label>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                    aria-invalid={
                      Boolean(error) || (password.length > 0 && !isPasswordValid)
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
                      onChange={(event) => setShowPassword(event.target.checked)}
                    />
                    Mostrar password
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
                  className="h-11 w-full rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Conectando..." : "Continuar"}
                </button>
                {isSubmitting ? (
                  <p className="text-[11px] text-slate-500">
                    Verificando credenciales…
                  </p>
                ) : null}
              </form>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                className="hover:text-slate-900"
                onClick={() => setShowReset((prev) => !prev)}
                disabled={isSubmitting}
              >
                Olvidé mi clave
              </button>
              <button
                type="button"
                className={`rounded-full px-2 py-1 transition ${
                  highlightRegister
                    ? "bg-primary/10 text-slate-900 ring-1 ring-primary/40"
                    : "hover:text-slate-900"
                }`}
                onClick={openRegister}
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

            <button
              type="button"
              className="login-bandida-action"
              aria-label="Crear cuenta"
              onMouseEnter={() => setHighlightRegister(true)}
              onMouseLeave={() => setHighlightRegister(false)}
              onFocus={() => setHighlightRegister(true)}
              onBlur={() => setHighlightRegister(false)}
              onClick={openRegister}
            >
              Crear cuenta
            </button>
          </div>
        </div>
      </div>

      {showRegister ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-10">
          <div className="relative w-full max-w-4xl sm:px-0">
            <div
              className={`glass-panel login-register-modal w-full overflow-hidden ${
                registerStep === "registro" ? "login-register-modal-registro" : ""
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
                  <Stepper />
                  {registerStep === "account" && registerConfirmed && registerConfirmedMessage ? (
                    <p className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      {registerConfirmedMessage}
                    </p>
                  ) : null}
                </div>
              </div>
              <div
                className={`login-register-body ${
                  registerStep === "account" ? "p-6" : "login-register-body-registro"
                }`}
              >
                {registerStep === "account" ? (
                <form className="space-y-4" onSubmit={onRegister} aria-busy={isRegistering}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="tu@email.com"
                          value={registerEmail}
                          onChange={(event) => setRegisterEmail(event.target.value)}
                          className="h-11 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                          Password
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
                        {registerPassword.length > 0 && !isRegisterPasswordValid ? (
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
                        onChange={(event) => setRegisterShowPassword(event.target.checked)}
                      />
                      Mostrar password
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
                        Creando cuenta…
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={resendConfirmation}
                        disabled={isResending || isRegistering}
                        className="font-semibold text-slate-600 hover:text-slate-900"
                      >
                        {isResending ? "Reenviando..." : "Reenviar confirmación"}
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
                      if (manualRegistroStep !== null && step !== manualRegistroStep) {
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
    </div>
  );
}

