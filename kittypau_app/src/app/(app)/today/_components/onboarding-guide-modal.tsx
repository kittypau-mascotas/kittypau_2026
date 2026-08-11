"use client";

import Link from "next/link";

/** Modal "Modo guía" — onboarding de bienvenida a /today, primera visita. */
export default function OnboardingGuideModal({
  petLabel,
  ownerLabel,
  onClose,
}: {
  petLabel: string;
  ownerLabel: string;
  onClose: () => void;
}) {
  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("kittypau_guide_seen", "1");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10">
      <div className="surface-card freeform-rise w-full max-w-lg px-6 py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Modo guía
        </p>
        <h2 className="display-title mt-2 text-2xl font-semibold text-slate-900">
          Bienvenido a Hoy en casa
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Aquí verás cuánto come {petLabel}. También verás el estado del plato y
          comentarios personalizados para {ownerLabel}.
        </p>
        <div className="mt-5 grid gap-3 text-xs text-slate-600">
          <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2">
            Consejo: usa “Ver diario” para ver eventos del día.
          </div>
          <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2">
            Consejo: revisa “Perfil conductual” para ajustes de mascota.
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            Entendido
          </button>
          <Link
            href="/registro"
            className="h-10 rounded-[var(--radius)] border border-slate-200 px-4 text-xs font-semibold text-slate-700"
            onClick={dismiss}
          >
            Completar registro
          </Link>
        </div>
      </div>
    </div>
  );
}
