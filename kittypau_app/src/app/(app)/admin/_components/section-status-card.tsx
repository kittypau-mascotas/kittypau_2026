/** Card de estado compartida por varias secciones de /admin (Operación,
 * Auditoría, Infraestructura, Finanzas, Tests) — badge ok/warning/critical +
 * score + KPIs + timestamp. Extraído tal cual de admin/page.tsx, cero cambio
 * de comportamiento. El cálculo de `SectionStatus` (score, alertas, umbrales)
 * sigue en el page.tsx — este componente solo renderiza. */

export type SectionStatus = {
  status: "ok" | "warning" | "critical";
  score: number;
  alerts: number;
  updatedAt: string | null;
  action: string;
  kpis: Array<{ label: string; value: string }>;
};

function formatAgo(value: string) {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "-";
  const diffMs = Date.now() - ts;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return `Hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Hace ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  return `Hace ${diffDay} d`;
}

export default function SectionStatusCard({
  title,
  data,
}: {
  title: string;
  data: SectionStatus;
}) {
  const styleByStatus: Record<SectionStatus["status"], string> = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    critical: "border-rose-200 bg-rose-50 text-rose-800",
  };
  const labelByStatus: Record<SectionStatus["status"], string> = {
    ok: "Estable",
    warning: "Atención",
    critical: "Crítico",
  };

  return (
    <div
      className={`mt-3 rounded-[var(--radius)] border px-3 py-2 ${styleByStatus[data.status]}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          {title}
        </p>
        <span className="text-xs font-semibold">
          {labelByStatus[data.status]} · {data.score}/100 · {data.alerts}{" "}
          alerta(s)
        </span>
      </div>
      <div className="mt-2 grid gap-1 text-xs md:grid-cols-2">
        {data.kpis.map((kpi) => (
          <p key={`${title}-${kpi.label}`}>
            <span className="font-semibold">{kpi.label}:</span> {kpi.value}
          </p>
        ))}
      </div>
      <p className="mt-2 text-[11px]">
        Última actualización: {data.updatedAt ? formatAgo(data.updatedAt) : "-"}{" "}
        · Acción: {data.action}
      </p>
    </div>
  );
}
