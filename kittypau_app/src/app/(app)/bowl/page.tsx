"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getAccessToken } from "@/lib/auth/token";

type ApiDevice = {
  id: string;
  pet_id: string;
  device_code: string;
  device_type: string;
  status: string;
  device_state: string | null;
  battery_level: number | null;
  last_seen: string | null;
};

type LoadState = {
  isLoading: boolean;
  error: string | null;
  devices: ApiDevice[];
};

const defaultState: LoadState = {
  isLoading: true,
  error: null,
  devices: [],
};

const apiBase = process.env.NEXT_PUBLIC_SITE_URL ?? "";

const parseListResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T[] }).data ?? [];
  }
  return [];
};

const formatTimestamp = (value: string | null) => {
  if (!value) return "Sin datos";
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return value;
  return ts.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const batteryLabel = (battery: number | null) => {
  if (battery === null || Number.isNaN(battery)) return "Sin datos";
  if (battery <= 15) return "Crítica";
  if (battery <= 35) return "Baja";
  if (battery <= 70) return "Media";
  return "Óptima";
};

export default function BowlPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const loadDevices = async (token: string) => {
    const res = await fetch(`${apiBase}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar los dispositivos.");
    const payload = await res.json();
    return parseListResponse<ApiDevice>(payload);
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const token = await getAccessToken();
      if (!token) {
        clearTokens();
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Sesión no válida. Vuelve a iniciar sesión.",
          }));
        }
        return;
      }

      try {
        const devices = await loadDevices(token);
        const storedDeviceId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("kittypau_device_id")
            : null;
        const primaryDevice =
          devices.find((device) => device.id === storedDeviceId) ?? devices[0];
        const initialId = primaryDevice?.id ?? null;
        if (initialId && typeof window !== "undefined") {
          window.localStorage.setItem("kittypau_device_id", initialId);
        }
        setSelectedDeviceId(initialId);
        if (!mounted) return;
        setState({
          isLoading: false,
          error: null,
          devices,
        });
      } catch (err) {
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "No se pudo cargar el estado del plato.",
        }));
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedDevice = useMemo(() => {
    return state.devices.find((device) => device.id === selectedDeviceId);
  }, [selectedDeviceId, state.devices]);

  const connectionHint = useMemo(() => {
    if (!selectedDevice?.last_seen) return "Sin check-in reciente.";
    const last = new Date(selectedDevice.last_seen).getTime();
    if (Number.isNaN(last)) return "Sin check-in reciente.";
    const diffMin = Math.round((Date.now() - last) / 60000);
    if (diffMin <= 5) return "Conectado en tiempo real.";
    if (diffMin <= 30) return "Conectado recientemente.";
    return "Conexión inestable o apagado.";
  }, [selectedDevice?.last_seen]);

  const actionNotes = useMemo(() => {
    const notes: string[] = [];
    if (selectedDevice?.battery_level !== null && selectedDevice?.battery_level !== undefined) {
      if (selectedDevice.battery_level <= 15) {
        notes.push("Carga el plato en las próximas horas.");
      }
    }
    if (!selectedDevice?.last_seen) {
      notes.push("Revisa energía y Wi‑Fi antes de usarlo.");
    }
    if (notes.length === 0) {
      notes.push("Todo estable. Mantén el plato conectado.");
    }
    return notes;
  }, [selectedDevice?.battery_level, selectedDevice?.last_seen]);

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Estado del plato</p>
          <h1>Dispositivo</h1>
        </div>
        <Link href="/today" className="ghost-link">
          Volver a hoy
        </Link>
      </div>

      {state.error && (
        <div className="alert alert-error">{state.error}</div>
      )}

      {state.isLoading ? (
        <div className="surface-card px-6 py-6">Cargando estado...</div>
      ) : state.devices.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No hay dispositivos vinculados.</p>
          <p className="empty-text">
            Conecta un plato para ver batería, estado y diagnósticos.
          </p>
          <div className="empty-actions">
            <Link
              href="/onboarding"
              className="rounded-[var(--radius)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Ir a onboarding
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="surface-card px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Plato activo</p>
                <p className="text-xl font-semibold text-slate-900">
                  {selectedDevice?.device_code ?? "Sin dispositivo"}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedDevice
                    ? `${selectedDevice.device_type} · ${selectedDevice.status}`
                    : "Conecta un dispositivo para ver el estado."}
                </p>
                {selectedDevice?.device_state ? (
                  <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    Estado técnico: {selectedDevice.device_state}
                  </span>
                ) : null}
              </div>
              {state.devices.length > 1 && (
                <label className="flex flex-col text-xs text-slate-500">
                  Cambiar dispositivo
                  <select
                    className="mt-1 rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    value={selectedDeviceId ?? ""}
                    onChange={(event) => {
                      const nextId = event.target.value || null;
                      setSelectedDeviceId(nextId);
                      if (nextId && typeof window !== "undefined") {
                        window.localStorage.setItem(
                          "kittypau_device_id",
                          nextId
                        );
                      }
                    }}
                  >
                    {state.devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.device_code}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>

          <section className="surface-card px-6 py-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Estado técnico
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedDevice?.device_state ?? "Sin datos"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Batería
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedDevice?.battery_level !== null &&
                  selectedDevice?.battery_level !== undefined
                    ? `${selectedDevice.battery_level}% · ${batteryLabel(
                        selectedDevice.battery_level
                      )}`
                    : "Sin datos"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Última conexión
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatTimestamp(selectedDevice?.last_seen ?? null)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{connectionHint}</p>
              </div>
            </div>
          </section>

          <section className="surface-card px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Diagnóstico rápido
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-400"
                disabled
              >
                Calibración remota (próximamente)
              </button>
              <button
                type="button"
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-400"
                disabled
              >
                Reinicio remoto (próximamente)
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
