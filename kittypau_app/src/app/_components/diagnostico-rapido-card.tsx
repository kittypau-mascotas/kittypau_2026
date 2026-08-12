/** Panel "Diagnóstico rápido" — Conexión/Energía/Firmware + acciones
 * recomendadas en lenguaje simple. Nació en /bowl (SPEC_02 U2 lo identificó
 * como el mejor patrón de confianza-en-los-datos de la app) y se generalizó
 * a /today y /pet. Lógica de umbrales en @/lib/device-diagnostics — este
 * componente solo renderiza. */
export default function DiagnosticoRapidoCard({
  title = "Diagnóstico rápido",
  connectionHint,
  batterySummary,
  batteryExtra,
  actionNotes,
  children,
}: {
  title?: string;
  connectionHint: string;
  batterySummary: string;
  batteryExtra: string;
  actionNotes: string[];
  children?: React.ReactNode;
}) {
  return (
    <section className="surface-card freeform-rise px-6 py-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Conexión
          </p>
          <p className="mt-2 text-slate-700">
            {connectionHint === "Conectado en tiempo real."
              ? "Datos en vivo. Todo responde bien."
              : connectionHint === "Conectado recientemente."
                ? "Último check-in dentro de la ventana esperada."
                : "Sin check-in reciente. Revisa energía y Wi-Fi."}
          </p>
        </div>
        <div className="rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Energía
          </p>
          <p className="mt-2 text-slate-700">
            {batterySummary === "Sin datos"
              ? "Sin datos de batería todavía."
              : `Batería ${batterySummary}`}
            {batteryExtra ? ` (${batteryExtra})` : ""}
          </p>
        </div>
        <div className="rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Firmware
          </p>
          <p className="mt-2 text-slate-700">
            Sincronizado (próximamente versión remota).
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 text-xs text-slate-600">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Acciones recomendadas
        </p>
        <ul className="mt-2 list-disc pl-4 text-slate-700">
          {actionNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
      {children}
    </section>
  );
}
