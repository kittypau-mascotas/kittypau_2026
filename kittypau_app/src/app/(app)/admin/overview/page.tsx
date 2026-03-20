"use client";

import { useEffect, useMemo, useState } from "react";
import { getValidAccessToken } from "@/lib/auth/token";

type AdminOverviewLite = {
  summary: {
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
  } | null;
  audit_events: Array<{
    id: string;
    event_type: string;
    entity_type: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
  }>;
  incident_counters: {
    bridge_offline_detected: number;
    device_offline_detected: number;
    general_device_outage_detected: number;
    general_device_outage_recovered: number;
  };
  active_general_outage: boolean;
};

async function fetchOverviewLite(): Promise<AdminOverviewLite | null> {
  const token = await getValidAccessToken();
  if (!token) return null;
  const params = new URLSearchParams({
    scope: "lite",
    audit_limit: "20",
    audit_window_min: String(24 * 60),
    audit_dedup_sec: "30",
  });
  const res = await fetch(`/api/admin/overview?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as AdminOverviewLite | null;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchOverviewLite()
        .then((payload) => {
          if (!active) return;
          setData(payload);
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setLoading(false);
        });

    load();
    const interval = window.setInterval(load, 300_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const updatedLabel = useMemo(() => {
    const raw = data?.summary?.generated_at ?? null;
    if (!raw) return new Date().toLocaleString();
    const ts = Date.parse(raw);
    if (!Number.isFinite(ts)) return new Date().toLocaleString();
    return new Date(ts).toLocaleString();
  }, [data?.summary?.generated_at]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-semibold text-slate-100">Cargando…</div>
        <div className="mt-1 text-xs text-slate-300">
          Preparando overview liviano
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold text-slate-200">
            Última actualización
          </div>
          <div className="mt-2 text-sm text-slate-100">{updatedLabel}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold text-slate-200">
            Dispositivos KPCL
          </div>
          <div className="mt-2 text-sm text-slate-100">
            {data?.summary?.kpcl_online_devices ?? "—"} online ·{" "}
            {data?.summary?.kpcl_offline_devices ?? "—"} offline ·{" "}
            {data?.summary?.kpcl_total_devices ?? "—"} total
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold text-slate-200">Bridges</div>
          <div className="mt-2 text-sm text-slate-100">
            {data?.summary?.bridge_active ?? "—"} active ·{" "}
            {data?.summary?.bridge_degraded ?? "—"} degraded ·{" "}
            {data?.summary?.bridge_offline ?? "—"} offline
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold text-slate-200">
            Eventos 24h
          </div>
          <div className="mt-2 text-sm text-slate-100">
            Outages: {data?.summary?.outages_last_24h ?? "—"} · Offline:{" "}
            {data?.summary?.offline_events_last_24h ?? "—"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">
              Alertas críticas
            </div>
            <div className="mt-1 text-xs text-slate-300">
              {data?.active_general_outage
                ? "🔴 Outage general activo"
                : "🟢 Sin outage general"}
            </div>
          </div>
          <div className="text-xs text-slate-300">
            Bridge offline:{" "}
            {data?.incident_counters?.bridge_offline_detected ?? 0}
            {" · "}
            Device offline:{" "}
            {data?.incident_counters?.device_offline_detected ?? 0}
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {(data?.audit_events ?? []).slice(0, 10).map((evt) => (
            <div
              key={evt.id}
              className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-100">
                  {evt.event_type}
                </div>
                <div className="text-[11px] text-slate-300">
                  {new Date(evt.created_at).toLocaleString()}
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-300">
                {evt.entity_type ?? "—"}
              </div>
            </div>
          ))}
          {(!data?.audit_events || data.audit_events.length === 0) && (
            <div className="text-xs text-slate-300">Sin alertas recientes.</div>
          )}
        </div>
      </div>
    </div>
  );
}
