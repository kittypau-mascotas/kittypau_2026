/** Sección "Avisos críticos" de /admin — botón de health-check + lista de
 * alertas activas. Extraído tal cual de admin/page.tsx. El fetch del
 * health-check queda en el page.tsx (`onRunHealthCheck`) porque toca
 * `reloadNonce` del padre — este componente solo dispara el callback. */

export default function AvisosCriticosCard({
  healthCheckStatus,
  canRunHealthCheck,
  onRunHealthCheck,
  criticalAlerts,
}: {
  healthCheckStatus: {
    running: boolean;
    lastRunAt: string | null;
    message: string | null;
  };
  canRunHealthCheck: boolean;
  onRunHealthCheck: () => void;
  criticalAlerts: string[];
}) {
  return (
    <section className="surface-card freeform-rise order-1 px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display-title text-xl font-semibold text-slate-900">
          Avisos críticos
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {healthCheckStatus.lastRunAt ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Último chequeo:{" "}
              {new Date(healthCheckStatus.lastRunAt).toLocaleTimeString(
                "es-CL",
                { hour: "2-digit", minute: "2-digit" },
              )}
            </span>
          ) : null}
          <button
            type="button"
            disabled={healthCheckStatus.running || !canRunHealthCheck}
            onClick={onRunHealthCheck}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {healthCheckStatus.running ? "Chequeando..." : "Ejecutar chequeo"}
          </button>
        </div>
      </div>
      {healthCheckStatus.message ? (
        <p className="mt-3 text-xs font-semibold text-slate-500">
          {healthCheckStatus.message}
        </p>
      ) : null}
      <div className="mt-3 grid gap-3">
        {criticalAlerts.length ? (
          criticalAlerts.map((alert) => (
            <div
              key={alert}
              className="rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {alert}
            </div>
          ))
        ) : (
          <div className="rounded-[var(--radius)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Sin alertas críticas activas.
          </div>
        )}
      </div>
    </section>
  );
}
