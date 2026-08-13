/** Sección "3) Infraestructura y Telemetría" de /admin — estado agregado +
 * (si `infraExpanded`) tabla de bridges + tabla de dispositivos KPCL
 * online/offline con batería. Extraído tal cual de admin/page.tsx, cero
 * cambio de comportamiento. `infraExpanded` sigue viniendo del page.tsx
 * (hoy una const `true`, ver comentario ahí) porque también gatea la
 * sección "Tablas y Vistas" que no es parte de este extracto. */

import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import SectionStatusCard, { type SectionStatus } from "./section-status-card";

type BridgeLive = {
  device_id: string;
  bridge_status: "active" | "degraded" | "offline";
  wifi_ip: string | null;
  last_seen: string | null;
};

type KpclDevice = {
  id: string;
  device_id: string;
  is_online: boolean;
  battery_level: number | null;
  last_seen: string | null;
};

export default function InfraestructuraCard({
  infraSectionStatus,
  infraExpanded,
  bridges,
  kpclDevices,
}: {
  infraSectionStatus: SectionStatus;
  infraExpanded: boolean;
  bridges: BridgeLive[];
  kpclDevices: KpclDevice[];
}) {
  return (
    <>
      <section
        id="admin-infraestructura"
        className="surface-card freeform-rise order-9 px-4 py-4 sm:px-6 sm:py-5"
      >
        <h2 className="display-title text-xl font-semibold text-slate-900">
          3) Infraestructura y Telemetría
        </h2>
        <SectionStatusCard
          title="Infraestructura y Telemetría"
          data={infraSectionStatus}
        />
      </section>

      {infraExpanded ? (
        <section className="order-10 grid gap-4 xl:grid-cols-2">
          <article className="surface-card freeform-rise px-6 py-5">
            <h2 className="display-title text-xl font-semibold text-slate-900">
              Estado de bridges
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="px-2 py-2 font-semibold">Bridge</th>
                    <th className="px-2 py-2 font-semibold">Estado</th>
                    <th className="hidden px-2 py-2 font-semibold sm:table-cell">
                      IP
                    </th>
                    <th className="px-2 py-2 font-semibold">Último seen</th>
                  </tr>
                </thead>
                <tbody>
                  {bridges.map((bridge) => (
                    <tr
                      key={bridge.device_id}
                      className="border-b border-slate-100"
                    >
                      <td className="px-2 py-2 font-semibold text-slate-800">
                        {bridge.device_id}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            bridge.bridge_status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : bridge.bridge_status === "degraded"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {bridge.bridge_status}
                        </span>
                      </td>
                      <td className="hidden px-2 py-2 sm:table-cell">
                        {bridge.wifi_ip ?? "-"}
                      </td>
                      <td className="px-2 py-2">
                        {bridge.last_seen
                          ? new Date(bridge.last_seen).toLocaleString("es-CL")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="surface-card freeform-rise px-6 py-5">
            <h2 className="display-title text-xl font-semibold text-slate-900">
              Estado KPCL (online/offline)
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="px-2 py-2 font-semibold">Device</th>
                    <th className="px-2 py-2 font-semibold">Estado</th>
                    <th className="hidden px-2 py-2 font-semibold sm:table-cell">
                      Batería
                    </th>
                    <th className="px-2 py-2 font-semibold">Último seen</th>
                  </tr>
                </thead>
                <tbody>
                  {kpclDevices.length ? (
                    kpclDevices.map((device) => (
                      <tr key={device.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">
                          {device.device_id}
                        </td>
                        <td className="hidden px-2 py-2 sm:table-cell">
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              device.is_online
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {device.is_online ? "online" : "offline"}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <BatteryStatusIcon
                              level={device.battery_level}
                              className="h-4 w-4"
                            />
                            {device.battery_level !== null
                              ? `${device.battery_level}%`
                              : "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          {device.last_seen
                            ? new Date(device.last_seen).toLocaleString("es-CL")
                            : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-2 py-2 text-slate-500" colSpan={4}>
                        Sin dispositivos KPCL.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}
    </>
  );
}
