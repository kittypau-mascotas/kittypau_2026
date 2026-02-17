"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";

type AdminSummary = {
  generated_at: string;
  kpcl_total_devices: number;
  kpcl_online_devices: number;
  kpcl_offline_devices: number;
  bridge_total: number;
  bridge_active: number;
  bridge_degraded: number;
  bridge_offline: number;
  outages_last_24h: number;
  offline_events_last_24h: number;
};

type AuditEvent = {
  id: string;
  event_type: string;
  entity_type: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type AuditFilter = "critical" | "bridge" | "devices" | "outages" | "all";

type AuditGroup = {
  key: string;
  event_type: string;
  entity_type: string | null;
  message: string | null;
  latest_at: string;
  count: number;
  sample: AuditEvent[];
};

type BridgeLive = {
  device_id: string;
  bridge_status: "active" | "degraded" | "offline";
  wifi_ip: string | null;
  hostname: string | null;
  last_seen: string | null;
  kpcl_total_devices: number;
  kpcl_online_devices: number;
  kpcl_offline_devices: number;
};

type OfflineDevice = {
  id: string;
  device_id: string;
  device_state: string | null;
  status: string | null;
  last_seen: string | null;
  battery_level: number | null;
  owner_id: string | null;
};

type IncidentCounters = {
  bridge_offline_detected: number;
  device_offline_detected: number;
  general_device_outage_detected: number;
  general_device_outage_recovered: number;
};

type PendingRegistration = {
  id: string;
  user_name: string | null;
  city: string | null;
  user_step: string | null;
  created_at: string;
  stage: "profile_pending" | "pet_pending" | "device_pending" | "completed";
};

type RegistrationSummary = {
  total_profiles: number;
  completed: number;
  pending_total: number;
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

function eventBadge(eventType: string) {
  const base = "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]";

  if (eventType.includes("recovered")) {
    return { label: "Recuperado", className: `${base} border-emerald-200 bg-emerald-50 text-emerald-700` };
  }
  if (eventType.includes("outage")) {
    return { label: "Outage", className: `${base} border-rose-200 bg-rose-50 text-rose-700` };
  }
  if (eventType.includes("offline")) {
    return { label: "Offline", className: `${base} border-amber-200 bg-amber-50 text-amber-800` };
  }
  if (eventType.includes("status_changed")) {
    return { label: "Estado", className: `${base} border-slate-200 bg-white text-slate-600` };
  }
  return { label: "Info", className: `${base} border-slate-200 bg-white text-slate-600` };
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [bridges, setBridges] = useState<BridgeLive[]>([]);
  const [offlineDevices, setOfflineDevices] = useState<OfflineDevice[]>([]);
  const [incidentCounters, setIncidentCounters] = useState<IncidentCounters | null>(
    null
  );
  const [registrationSummary, setRegistrationSummary] =
    useState<RegistrationSummary | null>(null);
  const [activeGeneralOutage, setActiveGeneralOutage] = useState(false);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("critical");
  const [auditWindowMin, setAuditWindowMin] = useState(60);
  const [groupAudit, setGroupAudit] = useState(true);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [healthCheckStatus, setHealthCheckStatus] = useState<{
    running: boolean;
    lastRunAt: string | null;
    message: string | null;
  }>({
    running: false,
    lastRunAt: null,
    message: null,
  });
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          throw new Error("Necesitas iniciar sesión.");
        }
        const params = new URLSearchParams({
          audit_limit: "60",
          audit_window_min: String(auditWindowMin),
          audit_dedup_sec: "30",
        });
        if (auditFilter === "bridge") params.set("audit_type", "bridge_offline_detected");
        if (auditFilter === "devices") params.set("audit_type", "device_offline_detected");
        if (auditFilter === "outages") params.set("audit_type", "general_device_outage_detected");

        const res = await fetch(`/api/admin/overview?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 403) {
            router.replace("/today");
            return;
          }
          throw new Error("No se pudo cargar el dashboard admin.");
        }
        const payload = await res.json();
        if (!mounted) return;
        setRole(payload.admin_role ?? null);
        setSummary(payload.summary ?? null);
        const nextEvents = (payload.audit_events ?? []) as AuditEvent[];
        if (auditFilter === "critical") {
          setEvents(
            nextEvents.filter((event) =>
              [
                "bridge_offline_detected",
                "device_offline_detected",
                "general_device_outage_detected",
                "general_device_outage_recovered",
              ].includes(event.event_type)
            )
          );
        } else {
          setEvents(nextEvents);
        }
        setBridges((payload.bridges ?? []) as BridgeLive[]);
        setOfflineDevices((payload.offline_devices ?? []) as OfflineDevice[]);
        setIncidentCounters((payload.incident_counters ?? null) as IncidentCounters | null);
        setRegistrationSummary(
          (payload.registration_summary ?? null) as RegistrationSummary | null
        );
        setActiveGeneralOutage(Boolean(payload.active_general_outage));
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Error no controlado.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    const interval = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [router, auditFilter, auditWindowMin, reloadNonce]);

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: "KPCL online",
        value: `${summary.kpcl_online_devices}/${summary.kpcl_total_devices}`,
      },
      {
        label: "KPCL offline",
        value: `${summary.kpcl_offline_devices}`,
      },
      {
        label: "Bridges online",
        value: `${summary.bridge_active}/${summary.bridge_total}`,
      },
      {
        label: "Bridges offline",
        value: `${summary.bridge_offline}`,
      },
      {
        label: "Outages 24h",
        value: `${summary.outages_last_24h}`,
      },
      {
        label: "Eventos offline 24h",
        value: `${summary.offline_events_last_24h}`,
      },
      {
        label: "Registros completos",
        value: `${registrationSummary?.completed ?? 0}/${registrationSummary?.total_profiles ?? 0}`,
      },
      {
        label: "Registros pendientes",
        value: `${registrationSummary?.pending_total ?? 0}`,
      },
    ];
  }, [summary, registrationSummary]);

  const groupedAudit = useMemo((): AuditGroup[] => {
    const map = new Map<string, AuditGroup>();
    for (const event of events) {
      const message =
        typeof event.payload?.message === "string" ? event.payload.message : null;
      const key = `${event.event_type}:${event.entity_type ?? ""}:${message ?? ""}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          event_type: event.event_type,
          entity_type: event.entity_type ?? null,
          message,
          latest_at: event.created_at,
          count: 1,
          sample: [event],
        });
        continue;
      }

      existing.count += 1;
      if (Date.parse(event.created_at) > Date.parse(existing.latest_at)) {
        existing.latest_at = event.created_at;
      }
      if (existing.sample.length < 6) {
        existing.sample.push(event);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => Date.parse(b.latest_at) - Date.parse(a.latest_at)
    );
  }, [events]);

  const criticalAlerts = useMemo(() => {
    const alerts: string[] = [];
    if (!summary) return alerts;
    if (summary.bridge_offline > 0) {
      alerts.push(`${summary.bridge_offline} bridge(s) offline.`);
    }
    if (summary.kpcl_offline_devices > 0) {
      alerts.push(`${summary.kpcl_offline_devices} dispositivo(s) KPCL offline.`);
    }
    if (activeGeneralOutage) {
      alerts.push("Incidente general activo en la red de dispositivos.");
    }
    if ((registrationSummary?.pending_device ?? 0) > 0) {
      alerts.push(
        `${registrationSummary?.pending_device ?? 0} registro(s) con dispositivo pendiente.`
      );
    }
    if ((registrationSummary?.stalled_24h ?? 0) > 0) {
      alerts.push(
        `${registrationSummary?.stalled_24h ?? 0} registro(s) incompletos con más de 24h.`
      );
    }
    return alerts;
  }, [summary, activeGeneralOutage, registrationSummary]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.7),_rgba(248,250,252,1))] px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="surface-card freeform-rise px-6 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin</p>
          <h1 className="display-title mt-1 text-3xl font-semibold text-slate-900">
            Dashboard Ejecutivo Kittypau
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Visión total de operación y auditoría en línea.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
              Rol: {role ?? "sin rol"}
            </span>
            <Link
              href="/today"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700"
            >
              Volver a la app
            </Link>
            <button
              type="button"
              onClick={() => {
                clearTokens();
                window.location.href = "/login";
              }}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {loading ? (
          <section className="surface-card freeform-rise px-6 py-6 text-sm text-slate-500">
            Cargando dashboard admin...
          </section>
        ) : null}

        {error ? (
          <section className="surface-card freeform-rise px-6 py-6 text-sm text-rose-700">
            {error}
          </section>
        ) : null}

        {!loading && !error && summary ? (
          <>
            <section className="surface-card freeform-rise px-6 py-5">
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
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={healthCheckStatus.running}
                    onClick={async () => {
                      const token = await getValidAccessToken();
                      if (!token) {
                        setHealthCheckStatus((prev) => ({
                          ...prev,
                          message: "Necesitas iniciar sesión.",
                        }));
                        return;
                      }
                      setHealthCheckStatus((prev) => ({
                        ...prev,
                        running: true,
                        message: null,
                      }));
                      try {
                        const res = await fetch(
                          "/api/admin/health-check?stale_min=10&device_stale_min=10",
                          {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                          }
                        );
                        const payload = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          throw new Error(
                            payload?.error ??
                              "No se pudo ejecutar el health-check."
                          );
                        }
                        setHealthCheckStatus({
                          running: false,
                          lastRunAt: new Date().toISOString(),
                          message: "Health-check ejecutado.",
                        });
                        setReloadNonce((n) => n + 1);
                      } catch (err) {
                        setHealthCheckStatus({
                          running: false,
                          lastRunAt: new Date().toISOString(),
                          message:
                            err instanceof Error
                              ? err.message
                              : "No se pudo ejecutar el health-check.",
                        });
                      }
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    {healthCheckStatus.running
                      ? "Chequeando..."
                      : "Ejecutar chequeo"}
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

            <section className="grid gap-4 md:grid-cols-3">
              {kpiCards.map((card) => (
                <article key={card.label} className="surface-card freeform-rise px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
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

            <section className="grid gap-4 lg:grid-cols-2">
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
                        <th className="px-2 py-2 font-semibold">IP</th>
                        <th className="px-2 py-2 font-semibold">Último seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bridges.map((bridge) => (
                        <tr key={bridge.device_id} className="border-b border-slate-100">
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
                          <td className="px-2 py-2">{bridge.wifi_ip ?? "-"}</td>
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
                  KPCL offline (detalle)
                </h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="px-2 py-2 font-semibold">Device</th>
                        <th className="px-2 py-2 font-semibold">Estado</th>
                        <th className="px-2 py-2 font-semibold">Batería</th>
                        <th className="px-2 py-2 font-semibold">Último seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offlineDevices.length ? (
                        offlineDevices.map((device) => (
                          <tr key={device.id} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-semibold text-slate-800">
                              {device.device_id}
                            </td>
                            <td className="px-2 py-2">{device.device_state ?? "-"}</td>
                            <td className="px-2 py-2">
                              {device.battery_level !== null ? `${device.battery_level}%` : "-"}
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
                            No hay KPCL offline.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section className="surface-card freeform-rise px-6 py-5">
              <h2 className="display-title text-xl font-semibold text-slate-900">
                Resumen de incidentes (24h)
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Bridge offline
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {incidentCounters?.bridge_offline_detected ?? 0}
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Device offline
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {incidentCounters?.device_offline_detected ?? 0}
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Outage detectado
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {incidentCounters?.general_device_outage_detected ?? 0}
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Outage recuperado
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {incidentCounters?.general_device_outage_recovered ?? 0}
                  </p>
                </div>
              </div>
            </section>

            <section className="surface-card freeform-rise px-6 py-5">
              <div className="flex items-center justify-between">
                <h2 className="display-title text-xl font-semibold text-slate-900">
                  Audit events en línea
                </h2>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Auto refresh 15s
                  </span>
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={groupAudit}
                      onChange={(event) => {
                        setGroupAudit(event.target.checked);
                        setExpandedGroupKey(null);
                      }}
                    />
                    Agrupar repetidos
                  </label>
                  <select
                    value={auditFilter}
                    onChange={(event) =>
                      setAuditFilter(event.target.value as AuditFilter)
                    }
                    className="h-8 rounded-[var(--radius)] border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600"
                    aria-label="Filtrar audit events"
                  >
                    <option value="critical">Críticos</option>
                    <option value="bridge">Bridge</option>
                    <option value="devices">Dispositivos</option>
                    <option value="outages">Outages</option>
                    <option value="all">Todos</option>
                  </select>
                  <select
                    value={auditWindowMin}
                    onChange={(event) => setAuditWindowMin(Number(event.target.value))}
                    className="h-8 rounded-[var(--radius)] border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600"
                    aria-label="Ventana de tiempo audit events"
                  >
                    <option value={15}>15 min</option>
                    <option value={60}>60 min</option>
                    <option value={180}>3 h</option>
                    <option value={1440}>24 h</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="px-2 py-2 font-semibold">Fecha</th>
                      <th className="px-2 py-2 font-semibold">Hace</th>
                      <th className="px-2 py-2 font-semibold">Evento</th>
                      <th className="px-2 py-2 font-semibold">Entidad</th>
                      <th className="px-2 py-2 font-semibold">Repeticiones</th>
                      <th className="px-2 py-2 font-semibold">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(groupAudit
                      ? groupedAudit
                      : events.map(
                          (event) =>
                            ({
                              key: event.id,
                              event_type: event.event_type,
                              entity_type: event.entity_type ?? null,
                              message:
                                typeof event.payload?.message === "string"
                                  ? event.payload.message
                                  : null,
                              latest_at: event.created_at,
                              count: 1,
                              sample: [event],
                            }) as AuditGroup
                        )
                    ).map((group) => {
                      const badge = eventBadge(group.event_type);
                      const isExpanded =
                        groupAudit && expandedGroupKey === group.key;
                      return (
                        <Fragment key={group.key}>
                          <tr className="border-b border-slate-100 align-top">
                            <td className="px-2 py-2 whitespace-nowrap">
                              {new Date(group.latest_at).toLocaleString("es-CL")}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-slate-500">
                              {formatAgo(group.latest_at)}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={badge.className}>
                                  {badge.label}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {group.event_type}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2">{group.entity_type ?? "-"}</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                                  ×{group.count}
                                </span>
                                {groupAudit && group.count > 1 ? (
                                  <button
                                    type="button"
                                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                                    onClick={() =>
                                      setExpandedGroupKey((prev) =>
                                        prev === group.key ? null : group.key
                                      )
                                    }
                                    aria-expanded={isExpanded}
                                  >
                                    {isExpanded ? "Ocultar" : "Ver"}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-2">{group.message ?? "-"}</td>
                          </tr>
                          {isExpanded ? (
                            <tr className="border-b border-slate-100">
                              <td colSpan={6} className="px-2 pb-3 pt-1">
                                <div className="rounded-[calc(var(--radius)-8px)] border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
                                  <p className="font-semibold text-slate-700">
                                    Muestras recientes (máx. {group.sample.length})
                                  </p>
                                  <div className="mt-2 grid gap-1">
                                    {group.sample.map((evt) => (
                                      <div
                                        key={evt.id}
                                        className="flex flex-wrap items-center justify-between gap-2"
                                      >
                                        <span className="text-slate-500">
                                          {new Date(evt.created_at).toLocaleString("es-CL")}
                                        </span>
                                        <span className="text-slate-700">
                                          {typeof evt.payload?.message === "string"
                                            ? evt.payload.message
                                            : "-"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}


