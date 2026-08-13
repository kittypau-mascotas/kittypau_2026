/** Sección "KPI ejecutivos" de /admin — grilla de 5 stat cards. Puramente
 * presentacional, `executiveKpis` ya viene calculado del page.tsx. */

export type ExecutiveKpi = {
  key: string;
  label: string;
  value: string;
  aux: string;
};

export default function KpiEjecutivosCard({ kpis }: { kpis: ExecutiveKpi[] }) {
  return (
    <section className="surface-card freeform-rise order-2 px-4 py-4 sm:px-6 sm:py-5">
      <h2 className="display-title text-xl font-semibold text-slate-900">
        KPI ejecutivos
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.key}
            className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {kpi.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {kpi.value}
            </p>
            <p className="text-xs text-slate-500">{kpi.aux}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
