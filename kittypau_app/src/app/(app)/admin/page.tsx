"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          throw new Error("Necesitas iniciar sesión.");
        }
        const res = await fetch("/api/admin/overview?audit_limit=40", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("No tienes permisos de administrador.");
          }
          throw new Error("No se pudo cargar el dashboard admin.");
        }
        const payload = await res.json();
        if (!mounted) return;
        setRole(payload.admin_role ?? null);
        setSummary(payload.summary ?? null);
        setEvents((payload.audit_events ?? []) as AuditEvent[]);
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
  }, []);

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
    ];
  }, [summary]);

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
            <section className="grid gap-4 md:grid-cols-3">
              {kpiCards.map((card) => (
                <article key={card.label} className="surface-card freeform-rise px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                </article>
              ))}
            </section>

            <section className="surface-card freeform-rise px-6 py-5">
              <div className="flex items-center justify-between">
                <h2 className="display-title text-xl font-semibold text-slate-900">
                  Audit events en línea
                </h2>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Auto refresh 15s
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="px-2 py-2 font-semibold">Fecha</th>
                      <th className="px-2 py-2 font-semibold">Evento</th>
                      <th className="px-2 py-2 font-semibold">Entidad</th>
                      <th className="px-2 py-2 font-semibold">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">
                          {new Date(event.created_at).toLocaleString("es-CL")}
                        </td>
                        <td className="px-2 py-2 font-semibold text-slate-800">{event.event_type}</td>
                        <td className="px-2 py-2">{event.entity_type ?? "-"}</td>
                        <td className="px-2 py-2">
                          {typeof event.payload?.message === "string"
                            ? event.payload.message
                            : "-"}
                        </td>
                      </tr>
                    ))}
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
