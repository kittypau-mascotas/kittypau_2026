const feedCards = [
  {
    title: "Todo tranquilo hoy",
    description: "Mishu bebió de forma estable y mantuvo su rutina habitual.",
    tone: "ok",
  },
  {
    title: "Ligera baja de hidratación",
    description: "Revisa el agua antes de la tarde para mantener el ritmo.",
    tone: "warning",
  },
  {
    title: "Comió más tarde de lo usual",
    description: "El primer evento de comida fue 30 min después de su promedio.",
    tone: "info",
  },
];

const toneStyles: Record<string, string> = {
  ok: "border-emerald-200/60 bg-emerald-50/60 text-emerald-800",
  warning: "border-amber-200/60 bg-amber-50/70 text-amber-800",
  info: "border-sky-200/60 bg-sky-50/70 text-sky-800",
};

export default function TodayPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.7),_rgba(248,250,252,1))] px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Hoy en casa
              </p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                Resumen del día
              </h1>
            </div>
            <div className="surface-card flex items-center gap-4 px-4 py-3">
              <div className="h-12 w-12 rounded-full bg-slate-200" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Mishu</p>
                <p className="text-xs text-slate-500">Plato comida · KPCL0200</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="surface-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Estado general
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Normal</p>
            </div>
            <div className="surface-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Última lectura
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Hace 3 min</p>
            </div>
            <div className="surface-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Hidratación
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Ligera baja</p>
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Feed interpretado
            </h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Ultimas 24h
            </span>
          </div>
          <div className="grid gap-4">
            {feedCards.map((card) => (
              <article
                key={card.title}
                className="surface-card flex flex-col gap-3 px-6 py-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {card.title}
                  </h3>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneStyles[card.tone]}`}
                  >
                    {card.tone === "ok"
                      ? "Estable"
                      : card.tone === "warning"
                      ? "Atención"
                      : "Info"}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{card.description}</p>
                <button
                  type="button"
                  className="mt-2 w-fit text-sm font-semibold text-slate-900"
                >
                  Ver detalles
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-card px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Estado del plato
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-slate-200/70 bg-slate-50/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Batería
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">82%</p>
            </div>
            <div className="rounded-[var(--radius)] border border-slate-200/70 bg-slate-50/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Último check-in
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                Hace 2 min
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
