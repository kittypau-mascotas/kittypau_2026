"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" || session?.user) {
        setIsReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!isMounted) return;
      if (sessionData.session?.user) {
        setIsReady(true);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!password || password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!supabase) {
      setError("Faltan variables públicas de Supabase en el entorno.");
      return;
    }
    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }
    setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
    setIsSubmitting(false);
    router.replace("/login?reset=1");
  };

  return (
    <div className="login-bg">
      <div className="login-layer">
        <span
          className="login-orb"
          style={{
            width: "240px",
            height: "240px",
            top: "12%",
            left: "10%",
            background: "rgba(79, 140, 255, 0.35)",
          }}
        />
        <span
          className="login-orb"
          style={{
            width: "320px",
            height: "320px",
            bottom: "-8%",
            right: "8%",
            background: "rgba(255, 196, 124, 0.45)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-16">
        <div className="glass-panel w-full max-w-md p-8">
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Reset de contraseña
              </p>
              <h1 className="display-title text-2xl font-semibold text-slate-900">
                Crea tu nueva clave
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Usa este formulario para definir una nueva contraseña segura.
              </p>
            </div>

            {!isReady ? (
              <p className="rounded-[var(--radius)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Abre este formulario desde el enlace de recuperación.
              </p>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    className="h-11 w-full rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ring"
                    placeholder="••••••••"
                  />
                </div>
                {error ? (
                  <p className="rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {error}
                  </p>
                ) : null}
                {message ? (
                  <p className="rounded-[var(--radius)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {message}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Guardando..." : "Actualizar contraseña"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
