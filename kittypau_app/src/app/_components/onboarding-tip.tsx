"use client";

import { useEffect, useState } from "react";

/** Generalización del modal "Modo guía" de /today (ver
 * `today/_components/onboarding-guide-modal.tsx`) a cualquier pantalla —
 * SPEC_02 U3. Un usuario que llega directo a /pet, /bowl o /story (ej. desde
 * un link compartido) recibe su propio tip contextual, sin depender de haber
 * pasado por /today primero. Cada pantalla tiene su propia clave de
 * localStorage (`kittypau_tip_seen_<screen>`), independiente del
 * `kittypau_guide_seen` que usa /today — se muestra una vez por pantalla,
 * no una vez por app. El componente decide solo si mostrarse: la página que
 * lo usa no necesita estado ni efecto propio. */

export default function OnboardingTip({
  screen,
  title,
  intro,
  tips,
}: {
  screen: string;
  title: string;
  intro?: string;
  tips: string[];
}) {
  const [open, setOpen] = useState(false);
  const storageKey = `kittypau_tip_seen_${screen}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Mismo caso ya resuelto así en login/page.tsx: leer localStorage y
    // togglear visibilidad una vez al montar no tiene alternativa a esta regla.
    const seen = window.localStorage.getItem(storageKey);
    if (!seen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
  }, [storageKey]);

  if (!open) return null;

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "1");
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10">
      <div className="surface-card freeform-rise w-full max-w-lg px-6 py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Modo guía
        </p>
        <h2 className="display-title mt-2 text-2xl font-semibold text-slate-900">
          {title}
        </h2>
        {intro ? <p className="mt-3 text-sm text-slate-600">{intro}</p> : null}
        <div className="mt-5 grid gap-3 text-xs text-slate-600">
          {tips.map((tip) => (
            <div
              key={tip}
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2"
            >
              {tip}
            </div>
          ))}
        </div>
        <div className="mt-5">
          <button
            type="button"
            onClick={dismiss}
            className="h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
