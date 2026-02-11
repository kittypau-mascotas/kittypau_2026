"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

type ApiDevice = {
  id: string;
  pet_id: string;
  device_id: string;
  device_type: string;
  status: string;
  device_state: string | null;
  battery_level: number | null;
  last_seen: string | null;
};

type ApiReading = {
  id: string;
  device_id: string;
  recorded_at: string | null;
  weight_grams: number | null;
  temperature: number | null;
  humidity: number | null;
  light_percent: number | null;
};

type LoadState = {
  isLoading: boolean;
  error: string | null;
  devices: ApiDevice[];
};

type ChartStylePreset =
  | "live_minimal"
  | "glass_stream"
  | "technical_grid"
  | "bold_editorial";

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

const buildSeries = (
  readings: ApiReading[],
  key: "weight_grams" | "temperature" | "humidity" | "light_percent",
  windowMs: number
) => {
  const cutoff = Date.now() - windowMs;
  return readings
    .map((reading) => ({
      value: reading[key],
      timestamp: reading.recorded_at,
    }))
    .filter((item): item is { value: number; timestamp: string } => {
      if (typeof item.value !== "number") return false;
      if (!item.timestamp) return false;
      const ts = new Date(item.timestamp).getTime();
      if (Number.isNaN(ts)) return false;
      return ts >= cutoff;
    });
};

const ChartCard = ({
  title,
  unit,
  series,
  accent,
  stylePreset,
  className,
}: {
  title: string;
  unit: string;
  series: { value: number; timestamp: string }[];
  accent: string;
  stylePreset: ChartStylePreset;
  className?: string;
}) => {
  const [streamTick, setStreamTick] = useState(false);
  const values = series.map((item) => item.value);
  const latest = values[0] ?? null;
  const latestValues = values.slice(0, 30).reverse();
  const plotWidth = 320;
  const plotHeight = 138;
  const marginLeft = 52;
  const marginTop = 20;
  const min = latestValues.length > 0 ? Math.min(...latestValues) : 0;
  const max = latestValues.length > 0 ? Math.max(...latestValues) : 1;
  const span = max - min || 1;
  const points = latestValues
    .map((value, index) => {
      const x = marginLeft + (index / (latestValues.length - 1 || 1)) * plotWidth;
      const y = marginTop + plotHeight - ((value - min) / span) * plotHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const latestDotY =
    latestValues.length > 0
      ? marginTop +
        plotHeight -
        ((latestValues[latestValues.length - 1] - min) / span) * plotHeight
      : marginTop + plotHeight / 2;
  const latestDotX = marginLeft + plotWidth;

  useEffect(() => {
    if (!series[0]?.timestamp) return;
    setStreamTick(true);
    const timeout = setTimeout(() => setStreamTick(false), 360);
    return () => clearTimeout(timeout);
  }, [series[0]?.timestamp]);

  return (
    <div
      className={`chart-card chart-style-${stylePreset} rounded-[calc(var(--radius)-6px)] border border-slate-200 bg-white px-5 py-5 ${
        className ?? ""
      }`}
    >
      <p className="chart-card-title text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {title}
      </p>
      <p className="chart-card-value mt-2 text-2xl font-semibold text-slate-900">
        {latest !== null ? `${latest} ${unit}` : "Sin datos"}
      </p>
      <div className="chart-card-canvas mt-4 h-56 w-full rounded-[calc(var(--radius)-8px)] bg-slate-50 px-3 py-3">
        {values.length > 1 ? (
          <div className={`chart-stream-wrap ${streamTick ? "chart-stream-tick" : ""}`}>
            <svg viewBox="0 0 420 220" className="h-full w-full">
              {stylePreset === "technical_grid" ? (
                <>
                  <line
                    x1={marginLeft}
                    y1={marginTop + plotHeight * 0.33}
                    x2={marginLeft + plotWidth}
                    y2={marginTop + plotHeight * 0.33}
                    className="chart-axis chart-gridline"
                  />
                  <line
                    x1={marginLeft}
                    y1={marginTop + plotHeight * 0.66}
                    x2={marginLeft + plotWidth}
                    y2={marginTop + plotHeight * 0.66}
                    className="chart-axis chart-gridline"
                  />
                </>
              ) : null}
              <line
                x1={marginLeft}
                y1={marginTop}
                x2={marginLeft}
                y2={marginTop + plotHeight}
                className="chart-axis"
              />
              <line
                x1={marginLeft}
                y1={marginTop + plotHeight}
                x2={marginLeft + plotWidth}
                y2={marginTop + plotHeight}
                className="chart-axis"
              />
              <text x="6" y={marginTop + 4} className="chart-axis-label">
                {max.toFixed(1)} {unit}
              </text>
              <text x="6" y={marginTop + plotHeight} className="chart-axis-label">
                {min.toFixed(1)} {unit}
              </text>
              <text
                x={marginLeft}
                y={marginTop + plotHeight + 24}
                className="chart-axis-label"
              >
                -5m
              </text>
              <text
                x={marginLeft + plotWidth - 40}
                y={marginTop + plotHeight + 24}
                className="chart-axis-label"
              >
                Ahora
              </text>
              <polyline
                fill="none"
                stroke={accent}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className={`chart-line ${streamTick ? "chart-line-draw" : ""}`}
              />
              <circle
                cx={latestDotX}
                cy={latestDotY}
                r="4"
                fill={accent}
                className="chart-live-dot"
              />
            </svg>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Aún sin lecturas recientes.</p>
        )}
      </div>
    </div>
  );
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
  const [readings, setReadings] = useState<ApiReading[]>([]);
  const [isReadingsLoading, setIsReadingsLoading] = useState(false);
  const [readingsError, setReadingsError] = useState<string | null>(null);
  const [chartStyle, setChartStyle] = useState<ChartStylePreset>("live_minimal");

  const loadDevices = async (token: string) => {
    const res = await fetch(`${apiBase}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar los dispositivos.");
    const payload = await res.json();
    return parseListResponse<ApiDevice>(payload);
  };

  const loadReadings = async (deviceId: string, token: string) => {
    const params = new URLSearchParams();
    params.set("device_id", deviceId);
    params.set("limit", "30");
    const res = await fetch(`${apiBase}/api/readings?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar lecturas.");
    const payload = await res.json();
    return parseListResponse<ApiReading>(payload);
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const token = await getValidAccessToken();
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
        if (initialId) {
          setIsReadingsLoading(true);
          const readingData = await loadReadings(initialId, token);
          if (mounted) {
            setReadings(readingData);
            setReadingsError(null);
          }
        }
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

  useEffect(() => {
    if (!selectedDeviceId) return;
    let active = true;
    const run = async () => {
      const token = await getValidAccessToken();
      if (!token || !active) return;
      try {
        setIsReadingsLoading(true);
        const readingData = await loadReadings(selectedDeviceId, token);
        if (!active) return;
        setReadings(readingData);
        setReadingsError(null);
      } catch (err) {
        if (!active) return;
        setReadingsError(
          err instanceof Error ? err.message : "No se pudieron cargar lecturas."
        );
      } finally {
        if (active) setIsReadingsLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [selectedDeviceId]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    let active = true;
    const run = async () => {
      const token = await getValidAccessToken();
      if (!token || !active) return;
      try {
        const readingData = await loadReadings(selectedDeviceId, token);
        if (!active) return;
        setReadings(readingData);
      } catch {
        // Realtime is primary; polling is fallback.
      }
    };
    const interval = setInterval(run, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedDeviceId]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const connect = async () => {
      const accessToken = await getValidAccessToken();
      if (!active || !accessToken) return;
      supabase.realtime.setAuth(accessToken);
      channel = supabase
        .channel(`bowl-readings:${selectedDeviceId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "readings",
            filter: `device_id=eq.${selectedDeviceId}`,
          },
          (payload) => {
            const nextReading = payload.new as ApiReading;
            setReadings((prev) => {
              const exists = prev.some((item) => item.id === nextReading.id);
              if (exists) return prev;
              return [nextReading, ...prev].slice(0, 60);
            });
          }
        )
        .subscribe();
    };

    void connect();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedDeviceId]);

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

  const statusSummary = useMemo(() => {
    if (!selectedDevice) return { label: "Sin datos", tone: "muted" as const };
    const battery = selectedDevice.battery_level ?? null;
    const last = selectedDevice.last_seen
      ? new Date(selectedDevice.last_seen).getTime()
      : null;
    const offline =
      last === null || Number.isNaN(last) || Date.now() - last > 30 * 60 * 1000;
    if (offline) return { label: "Atención", tone: "warn" as const };
    if (battery !== null && battery <= 15) {
      return { label: "Crítico", tone: "warn" as const };
    }
    if (battery !== null && battery <= 35) {
      return { label: "Requiere cuidado", tone: "warn" as const };
    }
    return { label: "Estable", tone: "ok" as const };
  }, [selectedDevice]);

  const actionNotes = useMemo(() => {
    const notes: string[] = [];
    if (selectedDevice?.battery_level !== null && selectedDevice?.battery_level !== undefined) {
      if (selectedDevice.battery_level <= 15) {
        notes.push("Carga el plato en las próximas horas.");
      } else if (selectedDevice.battery_level <= 35) {
        notes.push("Planifica una carga hoy para evitar apagados.");
      }
    }
    if (!selectedDevice?.last_seen) {
      notes.push("Revisa energía y Wi-Fi antes de usarlo.");
    }
    if (notes.length === 0) {
      notes.push("Todo estable. Mantén el plato conectado.");
    }
    return notes;
  }, [selectedDevice?.battery_level, selectedDevice?.last_seen]);

  const statusBlurb = useMemo(() => {
    if (!selectedDevice) return "Sin diagnóstico disponible.";
    if (statusSummary.tone === "warn") {
      return "Se detectó un riesgo operativo. Prioriza batería y conexión.";
    }
    if (statusSummary.tone === "ok") {
      return "Plato estable y conectado. Todo en orden.";
    }
    return "Sin datos suficientes para diagnóstico completo.";
  }, [selectedDevice, statusSummary.tone]);

  const weightSeries = useMemo(
    () => buildSeries(readings, "weight_grams", 5 * 60 * 1000),
    [readings]
  );
  const tempSeries = useMemo(
    () => buildSeries(readings, "temperature", 5 * 60 * 1000),
    [readings]
  );
  const humiditySeries = useMemo(
    () => buildSeries(readings, "humidity", 5 * 60 * 1000),
    [readings]
  );
  const lightSeries = useMemo(
    () => buildSeries(readings, "light_percent", 5 * 60 * 1000),
    [readings]
  );

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
        <div className="alert alert-error flex flex-wrap items-center justify-between gap-3">
          <span>{state.error}</span>
          <Link
            href="/login"
            className="rounded-[var(--radius)] border border-rose-200/70 bg-white px-3 py-2 text-[11px] font-semibold text-rose-700"
          >
            Iniciar sesión
          </Link>
        </div>
      )}

      {state.isLoading ? (
        <div className="surface-card freeform-rise px-6 py-6">Cargando estado...</div>
      ) : state.devices.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No hay dispositivos vinculados.</p>
          <p className="empty-text">
            Conecta un plato para ver batería, conexión y diagnóstico.
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
          <section className="surface-card freeform-rise px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Lecturas en vivo
              </h2>
              <div className="flex items-center gap-2">
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    Estilo gráfico
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-[var(--radius)] border border-slate-200 bg-white p-2 shadow-lg">
                    <button
                      type="button"
                      className="w-full rounded-[calc(var(--radius)-6px)] px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => setChartStyle("live_minimal")}
                    >
                      En vivo minimal
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-[calc(var(--radius)-6px)] px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => setChartStyle("glass_stream")}
                    >
                      Glass stream
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-[calc(var(--radius)-6px)] px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => setChartStyle("technical_grid")}
                    >
                      Técnico con grilla
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-[calc(var(--radius)-6px)] px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => setChartStyle("bold_editorial")}
                    >
                      Editorial bold
                    </button>
                  </div>
                </details>
                <span className="text-xs text-slate-500">
                  {isReadingsLoading ? "Actualizando..." : "En tiempo real"}
                </span>
              </div>
            </div>
            {readingsError ? (
              <p className="mt-3 text-sm text-rose-600">{readingsError}</p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <ChartCard
                  title="Peso"
                  unit="g"
                  series={weightSeries}
                  accent="hsl(var(--primary))"
                  stylePreset={chartStyle}
                />
                <ChartCard
                  title="Temperatura"
                  unit="°C"
                  series={tempSeries}
                  accent="hsl(var(--primary-strong))"
                  stylePreset={chartStyle}
                />
                <ChartCard
                  title="Luz entorno"
                  unit="%"
                  series={lightSeries}
                  accent="hsl(44 90% 52%)"
                  stylePreset={chartStyle}
                  className="lg:col-start-1"
                />
                <ChartCard
                  title="Humedad"
                  unit="%"
                  series={humiditySeries}
                  accent="hsl(198 70% 45%)"
                  stylePreset={chartStyle}
                  className="lg:col-start-2"
                />
              </div>
            )}
          </section>

          <section className="surface-card freeform-rise px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Plato activo</p>
                <p className="text-xl font-semibold text-slate-900">
                  {selectedDevice?.device_id ?? "Sin dispositivo"}
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
                        {device.device_id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <Link
                href="/pet"
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700"
              >
                Ver mascota
              </Link>
              <Link
                href="/settings"
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700"
              >
                Ajustes
              </Link>
            </div>
          </section>

          <section className="surface-card freeform-rise px-6 py-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Estado técnico
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedDevice?.device_state ?? "Sin datos"}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                    statusSummary.tone === "warn"
                      ? "bg-rose-100 text-rose-700"
                      : statusSummary.tone === "ok"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Estado general: {statusSummary.label}
                </span>
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
            <div className="mt-4 rounded-[calc(var(--radius)-6px)] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {statusBlurb}
            </div>
          </section>

          <section className="surface-card freeform-rise px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Diagnóstico rápido
            </h2>
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
                  {selectedDevice?.battery_level !== null &&
                  selectedDevice?.battery_level !== undefined
                    ? `Batería ${selectedDevice.battery_level}% · ${batteryLabel(
                        selectedDevice.battery_level
                      )}`
                    : "Sin datos de batería."}
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





