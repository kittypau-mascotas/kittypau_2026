"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const siteUrl = useMemo(
    () => process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin,
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      router.replace("/login?verified=1");
    }
  }, [router]);

  const handleRegister = async () => {
    setStatus("loading");
    setError(null);
    setResent(false);
    if (!email || !password) {
      setStatus("error");
      setError("Completa email y password para continuar.");
      return;
    }
    if (!email.includes("@")) {
      setStatus("error");
      setError("Ingresa un email válido.");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setError("El password debe tener al menos 8 caracteres.");
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setStatus("error");
      setError("Faltan variables públicas de Supabase en el entorno.");
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/login?verified=1`,
      },
    });

    if (signUpError) {
      setStatus("error");
      setError(signUpError.message);
      return;
    }

    setStatus("success");
  };

  const handleResend = async () => {
    setResent(false);
    setError(null);
    if (!email) {
      setError("Ingresa un email válido para reenviar.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Faltan variables públicas de Supabase en el entorno.");
      return;
    }

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${siteUrl}/login?verified=1` },
    });
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setResent(true);
  };

  return (
    <main className="login-bg flex items-center justify-center px-4 py-16">
      <div className="surface-card w-full max-w-md px-6 py-8">
        <p className="eyebrow">Registro</p>
        <h1 className="display-title text-3xl text-slate-900">Kittypau</h1>
        <p className="mt-2 text-sm text-slate-600">
          Crea tu cuenta y conecta tu plato en menos de 2 minutos.
        </p>

        <div className="mt-6 grid gap-4">
          <label className="text-sm text-slate-600">
            Email
            <input
              type="email"
              className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@correo.com"
              autoComplete="email"
            />
            <span className="mt-2 block text-xs text-slate-500">
              Usaremos este correo para confirmar tu cuenta.
            </span>
          </label>
          <label className="text-sm text-slate-600">
            Password
            <input
              type={showPassword ? "text" : "password"}
              className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            <span className="mt-2 block text-xs text-slate-500">
              Recomendado: 8+ caracteres con letras y números.
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            Mostrar password
          </label>
        </div>

        {status === "success" && (
          <div
            className="mt-4 rounded-[calc(var(--radius)-8px)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            role="status"
            aria-live="polite"
          >
            Revisa tu correo para confirmar la cuenta. Luego vuelve a iniciar sesión.
          </div>
        )}
        {error && (
          <div
            className="mt-4 rounded-[calc(var(--radius)-8px)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}
        {resent && (
          <div className="mt-4 rounded-[calc(var(--radius)-8px)] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Confirmación reenviada.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleRegister}
            disabled={status === "loading"}
            className="rounded-[var(--radius)] bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            {status === "loading" ? "Creando cuenta..." : "Crear cuenta"}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={!email || status === "loading"}
            className="rounded-[var(--radius)] border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-700"
          >
            Reenviar confirmación
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Si no llega el correo, revisa spam o intenta reenviar la confirmación.
        </p>

        <div className="mt-6 text-center text-xs text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-slate-800">
            Inicia sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
