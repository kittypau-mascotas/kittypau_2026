"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { setTokens } from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import OnboardingFlow from "@/app/(app)/onboarding/_components/onboarding-flow";

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
  const [registerStep, setRegisterStep] = useState<"account" | "onboarding">(
    "account"
  );
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const registerTitle = useMemo(
    () => (registerStep === "account" ? "Crear cuenta" : "Completar onboarding"),
    [registerStep]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      setVerifiedMessage("Cuenta verificada. Ya puedes iniciar sesión.");
    }
    if (params.get("reset") === "1") {
      setVerifiedMessage("Contraseña actualizada. Inicia sesión.");
    }
  }, []);

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

    router.push("/today");
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
        emailRedirectTo: `${siteUrl}/onboarding?verified=1`,
      },
    });

    if (signUpError) {
      setRegisterError(signUpError.message);
      setIsRegistering(false);
      return;
    }

    if (!data.session?.access_token) {
      setRegisterError(
        "Revisa tu correo (y spam) para confirmar la cuenta antes de continuar."
      );
      setIsRegistering(false);
      return;
    }

    setTokens({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
    setRegisterStep("onboarding");
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
  const canReset = Boolean(resetEmail || email);

  const closeRegister = () => {
    if (registerStep === "onboarding") {
      const ok = window.confirm("¿Quieres cerrar el registro? Se guardará el progreso.");
      if (!ok) return;
    }
    setShowRegister(false);
    setRegisterStep("account");
    setRegisterError(null);
  };

  return (
    <div className="login-bg">
      <div className="login-layer">
        <div className="login-collage" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-10 px-6 py-16 lg:flex-row lg:justify-between">
        <div className="max-w-xl space-y-6 text-left">
          <div className="inline-flex flex-col items-center gap-3">
            <img
              src="/logo_carga.jpg"
              alt="Kittypau"
              className="brand-hero-logo"
            />
            <span className="brand-title text-3xl text-slate-800">
              Kittypau
            </span>
          </div>
          <h1 className="display-title text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Tu plato inteligente, tu historia diaria.
          </h1>
          <p className="text-base leading-relaxed text-slate-600 md:text-lg">
            Accede a la lectura interpretada del comportamiento de tu mascota.
            Sin dashboards fríos, solo claridad y calma.
          </p>
          <div className="stagger grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="surface-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Última lectura
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Hace 3 min
              </p>
            </div>
            <div className="surface-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Estado general
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Todo normal
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel w-full max-w-md p-8">
          <div className="stagger space-y-6">
            <div>
              <h2 className="display-title text-2xl font-semibold text-slate-900">
                Iniciar sesión
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Usa tu correo para ver el estado de tu plato.
              </p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
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
                className="h-11 w-full rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Conectando..." : "Continuar"}
              </button>
              {!isSubmitting && !isLoginValid ? (
                <p className="text-[11px] text-slate-500">
                  Completa email y password (8+).
                </p>
              ) : null}
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                className="hover:text-slate-900"
                onClick={() => setShowReset((prev) => !prev)}
              >
                Olvidé mi clave
              </button>
              <button
                type="button"
                className="hover:text-slate-900"
                onClick={() => setShowRegister(true)}
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
      </div>

      {showRegister ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10">
          <div className="relative w-full max-w-4xl">
            <button
              type="button"
              onClick={closeRegister}
              className="absolute right-4 top-4 rounded-full border border-white/40 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
            >
              Cerrar
            </button>
            <div className="glass-panel overflow-hidden">
              <div className="border-b border-white/30 px-6 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Registro Kittypau
                </p>
                <h2 className="display-title text-2xl font-semibold text-slate-900">
                  {registerTitle}
                </h2>
              </div>
              <div className="p-6">
                {registerStep === "account" ? (
                  <form className="space-y-4" onSubmit={onRegister}>
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
                          type="password"
                          placeholder="••••••••"
                          value={registerPassword}
                          onChange={(event) =>
                            setRegisterPassword(event.target.value)
                          }
                          className="h-11 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    {registerError ? (
                      <p className="rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {registerError}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="h-11 w-full rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isRegistering ? "Creando..." : "Continuar"}
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={resendConfirmation}
                        disabled={isResending}
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
                  <OnboardingFlow mode="modal" onClose={closeRegister} />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

