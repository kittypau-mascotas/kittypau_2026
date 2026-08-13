/** Sección "2) Auditoría e Integridad de Datos" de /admin — estado agregado +
 * resumen de registro + tabla de registros pendientes recientes. Extraído
 * tal cual de admin/page.tsx, cero cambio de comportamiento. `formatAgo`
 * duplicado a propósito, mismo patrón que `section-status-card.tsx` (el
 * page.tsx sigue usando su propia copia para "Audit events en línea"). */

import SectionStatusCard, { type SectionStatus } from "./section-status-card";

type PendingRegistration = {
  id: string;
  user_name: string | null;
  city: string | null;
  created_at: string;
  stage: "profile_pending" | "pet_pending" | "device_pending" | "completed";
};

type RegistrationSummary = {
  pending_profile: number;
  pending_pet: number;
  pending_device: number;
  stalled_24h: number;
  pending_recent: PendingRegistration[];
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

export default function AuditoriaCard({
  auditSectionStatus,
  registrationSummary,
}: {
  auditSectionStatus: SectionStatus;
  registrationSummary: RegistrationSummary | null;
}) {
  return (
    <>
      <section
        id="admin-auditoria"
        className="surface-card freeform-rise order-6 px-4 py-4 sm:px-6 sm:py-5"
      >
        <h2 className="display-title text-xl font-semibold text-slate-900">
          2) Auditoría e Integridad de Datos
        </h2>
        <SectionStatusCard
          title="Auditoría e Integridad"
          data={auditSectionStatus}
        />
      </section>

      <section className="order-7 grid gap-4 xl:grid-cols-2">
        <article className="surface-card freeform-rise px-6 py-5">
          <h2 className="display-title text-xl font-semibold text-slate-900">
            Estado de registro
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Perfil pendiente
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {registrationSummary?.pending_profile ?? 0}
              </p>
            </div>
            <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Mascota pendiente
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {registrationSummary?.pending_pet ?? 0}
              </p>
            </div>
            <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Dispositivo pendiente
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {registrationSummary?.pending_device ?? 0}
              </p>
            </div>
            <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Incompletos {" > "} 24h
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {registrationSummary?.stalled_24h ?? 0}
              </p>
            </div>
          </div>
        </article>

        <article className="surface-card freeform-rise px-6 py-5">
          <h2 className="display-title text-xl font-semibold text-slate-900">
            Registros pendientes recientes
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="px-2 py-2 font-semibold">Usuario</th>
                  <th className="px-2 py-2 font-semibold">Etapa</th>
                  <th className="px-2 py-2 font-semibold">Alta</th>
                </tr>
              </thead>
              <tbody>
                {(registrationSummary?.pending_recent ?? []).length ? (
                  (registrationSummary?.pending_recent ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-800">
                        {row.user_name ?? "Sin nombre"}
                        {row.city ? ` (${row.city})` : ""}
                      </td>
                      <td className="px-2 py-2">
                        {row.stage === "profile_pending"
                          ? "Perfil"
                          : row.stage === "pet_pending"
                            ? "Mascota"
                            : "Dispositivo"}
                      </td>
                      <td className="px-2 py-2">
                        {row.created_at ? formatAgo(row.created_at) : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-2 py-2 text-slate-500" colSpan={3}>
                      Sin registros pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}
