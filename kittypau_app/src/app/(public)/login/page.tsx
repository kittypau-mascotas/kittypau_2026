"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { setTokens } from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

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

  return (
    <div className="login-bg">
      <div className="login-layer">
        <span
          className="login-orb"
          style={{
            width: "220px",
            height: "220px",
            top: "12%",
            left: "8%",
            background: "rgba(79, 140, 255, 0.35)",
          }}
        />
        <span
          className="login-orb"
          style={{
            width: "320px",
            height: "320px",
            bottom: "-8%",
            right: "6%",
            background: "rgba(255, 196, 124, 0.45)",
          }}
        />
        <span
          className="login-orb"
          style={{
            width: "140px",
            height: "140px",
            bottom: "18%",
            left: "28%",
            background: "rgba(148, 204, 255, 0.4)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-10 px-6 py-16 lg:flex-row lg:justify-between">
        <div className="max-w-xl space-y-6 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Kittypau IoT
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Tu plato inteligente, tu historia diaria.
          </h1>
          <p className="text-base leading-relaxed text-slate-600 md:text-lg">
            Accede a la lectura interpretada del comportamiento de tu mascota.
            Sin dashboards fríos, solo claridad y calma.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
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
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Iniciar sesión
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Usa tu correo para ver el estado de tu plato.
              </p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {error ? (
                <p className="rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Conectando..." : "Continuar"}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <button type="button" className="hover:text-slate-900">
                Olvidé mi clave
              </button>
              <button type="button" className="hover:text-slate-900">
                Crear cuenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
