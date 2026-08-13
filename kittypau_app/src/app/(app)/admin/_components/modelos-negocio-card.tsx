/** Sección "Modelos de Negocio" de /admin — 3 caminos de negocio (A/B/C),
 * métricas de escalamiento (4) y simulador de valorización SaaS + 3 cards de
 * fase. Puramente presentacional: businessModels/scalingMetrics/saasValuation
 * ya vienen calculados del page.tsx. Extraído tal cual, cero cambio de
 * comportamiento. */

export type BusinessModelCard = {
  key: string;
  rank: number;
  title: string;
  why: string;
  status: string;
  metrics: string[];
};

export type ScalingMetrics = {
  infraMonthlyUsd: number;
  costPerActive: number;
  costPer1000: number;
  marginIncremental: number;
};

export type SaasValuation = {
  premiumUsersProxy: number;
  activeUsersProxy: number;
  mrr: number | null;
  arr: number | null;
  arpuFreemium: number | null;
  ltv: number | null;
  cac: number | null;
  ltvCac: number | null;
  saasMultiple: number | null;
  ev6: number | null;
  ev12: number | null;
};

export default function ModelosNegocioCard({
  businessModels,
  scalingMetrics,
  saasValuation,
}: {
  businessModels: BusinessModelCard[];
  scalingMetrics: ScalingMetrics;
  saasValuation: SaasValuation;
}) {
  return (
    <section className="surface-card freeform-rise order-2 px-4 py-4 sm:px-6 sm:py-5">
      <h2 className="display-title text-xl font-semibold text-slate-900">
        Modelos de Negocio
      </h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {businessModels.map((card) => (
          <article
            key={card.key}
            className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {card.title}
              </p>
              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                #{card.rank} · {card.status}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-700">
              {card.why}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {card.metrics.map((metric) => (
                <li key={`${card.key}-${metric}`}>{metric}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div
        id="admin-escalamiento"
        className="mt-4 rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3"
      >
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          4) Escalamiento (métricas operativas)
        </p>
        <div className="mt-2 grid gap-2 text-xs text-slate-700 md:grid-cols-4">
          <p>
            <span className="font-semibold">Infra mensual:</span> USD{" "}
            {scalingMetrics.infraMonthlyUsd.toFixed(2)}
          </p>
          <p>
            <span className="font-semibold">Costo/usuario activo:</span> USD{" "}
            {scalingMetrics.costPerActive.toFixed(2)}
          </p>
          <p>
            <span className="font-semibold">Costo por 1.000:</span> USD{" "}
            {scalingMetrics.costPer1000.toFixed(2)}
          </p>
          <p>
            <span className="font-semibold">Carga incremental:</span>{" "}
            {scalingMetrics.marginIncremental.toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Valorización SaaS (simulador)
        </p>
        <div className="mt-2 grid gap-2 text-xs text-slate-700 md:grid-cols-4">
          <p>
            <span className="font-semibold">MRR:</span>{" "}
            {saasValuation.mrr !== null
              ? `USD ${saasValuation.mrr.toFixed(2)}`
              : "N/D"}
          </p>
          <p>
            <span className="font-semibold">ARR:</span>{" "}
            {saasValuation.arr !== null
              ? `USD ${saasValuation.arr.toFixed(2)}`
              : "N/D"}
          </p>
          <p>
            <span className="font-semibold">ARPU Freemium:</span>{" "}
            {saasValuation.arpuFreemium !== null
              ? `USD ${saasValuation.arpuFreemium.toFixed(2)}`
              : "N/D"}
          </p>
          <p>
            <span className="font-semibold">LTV/CAC:</span>{" "}
            {saasValuation.ltvCac !== null
              ? `${saasValuation.ltvCac.toFixed(2)}x`
              : "N/D"}
          </p>
          <p>
            <span className="font-semibold">Múltiplo SaaS:</span>{" "}
            {saasValuation.saasMultiple !== null
              ? `${saasValuation.saasMultiple.toFixed(1)}x`
              : "N/D"}
          </p>
          <p>
            <span className="font-semibold">Valorización 6m:</span>{" "}
            {saasValuation.ev6 !== null
              ? `USD ${saasValuation.ev6.toFixed(2)}`
              : "N/D"}
          </p>
          <p>
            <span className="font-semibold">Valorización 12m:</span>{" "}
            {saasValuation.ev12 !== null
              ? `USD ${saasValuation.ev12.toFixed(2)}`
              : "N/D"}
          </p>
          <p>
            <span className="font-semibold">Base usuarios:</span>{" "}
            {saasValuation.premiumUsersProxy}/{saasValuation.activeUsersProxy}{" "}
            (premium/activos)
          </p>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Proyección con crecimiento MRR del 3% mensual y múltiplo ajustado por
          LTV/CAC y churn.
        </p>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <article className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">
            Fase 1 (actual): Camino A
          </p>
          <p className="mt-1">Objetivo: ingreso recurrente y LTV/CAC &gt; 3.</p>
          <p className="mt-1 text-slate-500">KPI crítico: LTV/CAC y MRR.</p>
        </article>
        <article className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Fase 2: Camino C</p>
          <p className="mt-1">
            Objetivo: escalar base activa con conversión freemium.
          </p>
          <p className="mt-1 text-slate-500">
            KPI crítico: conversión free→paid &gt; 8%.
          </p>
        </article>
        <article className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Fase 3: Camino B / B2B</p>
          <p className="mt-1">
            Objetivo: caja táctica y expansión (veterinarias/seguros).
          </p>
          <p className="mt-1 text-slate-500">
            KPI crítico: margen premium &gt; 45%.
          </p>
        </article>
      </div>
    </section>
  );
}
