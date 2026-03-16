"use client";

import { useEffect, useMemo, useState } from "react";

type DemoIngresoItem = {
  id: string;
  email: string;
  owner_name: string | null;
  pet_name: string | null;
  source: string;
  first_seen_at: string;
  last_seen_at: string;
  count: number;
};

type DemoIngresoResponseOk = { ok: true; items: DemoIngresoItem[] };
type DemoIngresoResponseErr = { ok?: false; error?: string; message?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default function AdminDemoIngresosPage() {
  const [items, setItems] = useState<DemoIngresoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/demo-ingresos?limit=250", {
          credentials: "include",
        });
        const jsonUnknown: unknown = await res.json();
        const json = (isRecord(jsonUnknown) ? jsonUnknown : {}) as
          | DemoIngresoResponseOk
          | DemoIngresoResponseErr;

        if (!res.ok || !("ok" in json) || json.ok !== true) {
          const msg =
            ("message" in json ? json.message : undefined) ??
            ("error" in json ? json.error : undefined) ??
            "No se pudo cargar Demo Ingresos";
          throw new Error(msg);
        }

        if (!canceled) setItems(json.items ?? []);
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Error desconocido");
        }
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, []);

  const rows = useMemo(() => items, [items]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Demo Ingresos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Bandeja deduplicada por email (historial completo queda en{" "}
            <span className="font-mono">audit_events</span>)
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          {isLoading ? "Cargando…" : `${rows.length} registros`}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Titular</th>
                <th className="px-4 py-3">Mascota</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Count</th>
                <th className="px-4 py-3">First</th>
                <th className="px-4 py-3">Last</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-slate-900">
                    {row.email}
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    {row.owner_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    {row.pet_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {row.source}
                  </td>
                  <td className="px-4 py-3 text-slate-800">{row.count}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {row.first_seen_at}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {row.last_seen_at}
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Sin ingresos registrados todavía
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
