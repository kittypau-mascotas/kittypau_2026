"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { syncSelectedDevice } from "@/lib/runtime/selection-sync";
import Alert from "@/app/_components/alert";
import EmptyState from "@/app/_components/empty-state";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import { buildSeries, ChartCard } from "@/lib/charts";

type ApiDevice = {
  id: string;
  pet_id: string;
  device_id: string;
  device_type: string;
  status: string;
  device_state: string | null;
  battery_level: number | null;
  battery_voltage?: number | null;
  battery_state?: string | null;
  battery_source?: string | null;
  battery_is_estimated?: boolean | null;
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
  battery_level?: number | null;
  battery_voltage?: number | null;
  battery_state?: string | null;
  battery_source?: string | null;
  battery_is_estimated?: boolean | null;
};

type LoadState = {
  isLoading: boolean;
  error: string | null;
  devices: ApiDevice[];
};

type ChartRangeKey = "5m" | "15m" | "1h" | "1d" | "1w";

const defaultState: LoadState = {
  isLoading: true,
  error: null,
  devices: [],
};

const CHART_RANGES: {
  key: ChartRangeKey;
  label: string;
  windowMs: number;
  queryLimit: number;
  fromLabel: string;
}[] = [
  {
    key: "5m",
    label: "5 min",
    windowMs: 5 * 60 * 1000,
    queryLimit: 120,
    maxPoints: 30,
    fromLabel: "-5m",
  },
  {
    key: "15m",
    label: "15 min",
    windowMs: 15 * 60 * 1000,
    queryLimit: 220,
    maxPoints: 60,
    fromLabel: "-15m",
  },
  {
    key: "1h",
    label: "1 hora",
    windowMs: 60 * 60 * 1000,
    queryLimit: 420,
    maxPoints: 120,
    fromLabel: "-1h",
  },
  {
    key: "1d",
    label: "1 dia",
    windowMs: 24 * 60 * 60 * 1000,
    queryLimit: 3000,
    maxPoints: 288,
    fromLabel: "-1d",
  },
  {
    key: "1w",
    label: "1 semana",
    windowMs: 7 * 24 * 60 * 60 * 1000,
    queryLimit: 5000,
    maxPoints: 400,
    fromLabel: "-1sem",
  },
];

const READINGS_BUFFER_MAX = 4000;

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

const formatBatterySource = (source?: string | null) => {
  if (source === "usb") return "USB";
  if (source === "battery") return "Batería";
  return "Sin fuente";
};

const resolveDevicePowerState = (
  device: Pick<ApiDevice, "device_state" | "status"> | null | undefined,
): "on" | "off" | "nodata" => {
  if (!device) return "nodata";
  const state = (device.device_state ?? "").toLowerCase();
  const status = (device.status ?? "").toLowerCase();
  if (!state && !status) return "nodata";
  if (
    state.includes("offline") ||
    status === "offline" ||
    status === "inactive"
  ) {
    return "off";
  }
  if (
    state.includes("online") ||
    state.includes("linked") ||
    status === "active" ||
    status === "linked"
  ) {
    return "on";
  }
  return "nodata";
};

const deviceToTestLabel = (deviceId: string | null | undefined) => {
  if (!deviceId) return "Test_----";
  const match = deviceId.match(/(\d{3,4})$/);
  if (!match) return deviceId;
  return `Test_${match[1]}`;
};

export default function BowlPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [readings, setReadings] = useState<ApiReading[]>([]);
  const [selectedRange, setSelectedRange] = useState<ChartRangeKey>("5m");
  const [isReadingsLoading, setIsReadingsLoading] = useState(false);
  const [readingsError, setReadingsError] = useState<string | null>(null);

  const loadDevices = async (token: string) => {
    const res = await fetch(`/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar los dispositivos.");
    const payload = await res.json();
    return parseListResponse<ApiDevice>(payload);
  };

  const loadReadings = async (
    deviceId: string,
    token: string,
    limit: number,
    windowMs?: number,
  ) => {
    const params = new URLSearchParams();
    params.set("device_id", deviceId);
    params.set("limit", String(limit));
    if (windowMs) {
      const from = new Date(Date.now() - windowMs).toISOString();
      params.set("from", from);
    }
    const res = await fetch(`/api/readings?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar lecturas.");
    const payload = await res.json();
    return parseListResponse<ApiReading>(payload);
  };

  // Carga de devices: solo se ejecuta al montar el componente.
  // Las lecturas son responsabilidad del siguiente useEffect (deps: selectedDeviceId + selectedRange).
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
          window.localStorage.getItem("kittypau_device_id");
        const primaryDevice =
          devices.find((device) => device.id === storedDeviceId) ?? devices[0];
        const initialId = primaryDevice?.id ?? null;
        if (initialId) {
          syncSelectedDevice(initialId);
        }
        if (!mounted) return;
        setSelectedDeviceId(initialId);
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
        const selectedConfig =
          CHART_RANGES.find((range) => range.key === selectedRange) ??
          CHART_RANGES[0];
        const readingData = await loadReadings(
          selectedDeviceId,
          token,
          selectedConfig.queryLimit,
          selectedConfig.windowMs,
        );
        if (!active) return;
        setReadings(readingData);
        setReadingsError(null);
      } catch (err) {
        if (!active) return;
        setReadingsError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar lecturas.",
        );
      } finally {
        if (active) setIsReadingsLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [selectedDeviceId, selectedRange]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    let active = true;
    const run = async () => {
      const token = await getValidAccessToken();
      if (!token || !active) return;
      try {
        const selectedConfig =
          CHART_RANGES.find((range) => range.key === selectedRange) ??
          CHART_RANGES[0];
        const readingData = await loadReadings(
          selectedDeviceId,
          token,
          selectedConfig.queryLimit,
          selectedConfig.windowMs,
        );
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
  }, [selectedDeviceId, selectedRange]);

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
              return [nextReading, ...prev].slice(0, READINGS_BUFFER_MAX);
            });
          },
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

  const selectedDeviceIndex = useMemo(() => {
    return state.devices.findIndex((device) => device.id === selectedDeviceId);
  }, [selectedDeviceId, state.devices]);

  const selectedDeviceTestLabel = useMemo(() => {
    return deviceToTestLabel(selectedDevice?.device_id);
  }, [selectedDevice?.device_id]);

  const selectorPowerState = useMemo(() => {
    return resolveDevicePowerState(selectedDevice);
  }, [selectedDevice]);

  const selectorDotClass =
    selectorPowerState === "on"
      ? "bg-emerald-500 border-emerald-400"
      : selectorPowerState === "off"
        ? "bg-rose-500 border-rose-400"
        : "bg-white border-slate-300";

  const cycleDevice = (offset: -1 | 1) => {
    if (state.devices.length <= 1 || selectedDeviceIndex < 0) return;
    const nextIndex =
      (selectedDeviceIndex + offset + state.devices.length) %
      state.devices.length;
    const nextDeviceId = state.devices[nextIndex]?.id ?? null;
    if (!nextDeviceId) return;
    setSelectedDeviceId(nextDeviceId);
    syncSelectedDevice(nextDeviceId);
  };

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
    if (
      selectedDevice?.battery_level !== null &&
      selectedDevice?.battery_level !== undefined
    ) {
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

  const selectedRangeConfig = useMemo(() => {
    return (
      CHART_RANGES.find((range) => range.key === selectedRange) ??
      CHART_RANGES[0]
    );
  }, [selectedRange]);

  const latestWeightValue = useMemo(
    () =>
      readings.find((item) => typeof item.weight_grams === "number")
        ?.weight_grams ?? null,
    [readings],
  );
  const latestTempValue = useMemo(
    () =>
      readings.find((item) => typeof item.temperature === "number")
        ?.temperature ?? null,
    [readings],
  );
  const latestHumidityValue = useMemo(
    () =>
      readings.find((item) => typeof item.humidity === "number")?.humidity ??
      null,
    [readings],
  );
  const latestLightValue = useMemo(
    () =>
      readings.find((item) => typeof item.light_percent === "number")
        ?.light_percent ?? null,
    [readings],
  );

  const latestBatteryReading = useMemo(
    () =>
      readings.find(
        (item) =>
          typeof item.battery_level === "number" ||
          typeof item.battery_voltage === "number" ||
          typeof item.battery_source === "string",
      ) ?? null,
    [readings],
  );

  const batteryLevelValue =
    selectedDevice?.battery_level ??
    latestBatteryReading?.battery_level ??
    null;
  const batteryVoltageValue =
    selectedDevice?.battery_voltage ??
    latestBatteryReading?.battery_voltage ??
    null;
  const batterySourceValue =
    selectedDevice?.battery_source ??
    latestBatteryReading?.battery_source ??
    null;
  const batteryEstimatedValue =
    selectedDevice?.battery_is_estimated ??
    latestBatteryReading?.battery_is_estimated ??
    false;
  const batterySummary =
    batteryLevelValue !== null && batteryLevelValue !== undefined
      ? `${batteryLevelValue}% · ${batteryLabel(batteryLevelValue)}`
      : "Sin datos";
  const batteryExtra = [
    batteryEstimatedValue ? "estimada" : null,
    formatBatterySource(batterySourceValue),
    typeof batteryVoltageValue === "number"
      ? `${batteryVoltageValue.toFixed(2)}V`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const weightSeries = useMemo(
    () =>
      buildSeries(
        readings,
        (r) => r.weight_grams,
        selectedRangeConfig.windowMs,
      ),
    [readings, selectedRangeConfig.windowMs],
  );
  const tempSeries = useMemo(
    () =>
      buildSeries(readings, (r) => r.temperature, selectedRangeConfig.windowMs),
    [readings, selectedRangeConfig.windowMs],
  );
  const humiditySeries = useMemo(
    () =>
      buildSeries(readings, (r) => r.humidity, selectedRangeConfig.windowMs),
    [readings, selectedRangeConfig.windowMs],
  );
  const lightSeries = useMemo(
    () =>
      buildSeries(
        readings,
        (r) => r.light_percent,
        selectedRangeConfig.windowMs,
      ),
    [readings, selectedRangeConfig.windowMs],
  );

  return (
    <main className="page-shell">
      {state.error && (
        <Alert
          variant="error"
          title="Error"
          actions={
            <Link
              href="/login"
              className="rounded-[var(--radius)] border border-rose-200/70 bg-white px-3 py-2 text-[11px] font-semibold text-rose-700"
            >
              Iniciar sesión
            </Link>
          }
        >
          {state.error}
        </Alert>
      )}

      {state.isLoading ? (
        <div className="surface-card freeform-rise px-6 py-6">
          Cargando estado...
        </div>
      ) : state.devices.length === 0 ? (
        <EmptyState
          title="No hay dispositivos vinculados."
          actions={
            <Link
              href="/registro"
              className="rounded-[var(--radius)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Ir a registro
            </Link>
          }
        >
          Conecta un plato para ver batería, conexión y diagnóstico.
        </EmptyState>
      ) : (
        <>
          <section className="surface-card freeform-rise px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Lecturas en vivo
              </h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="mr-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cycleDevice(-1)}
                    className="text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
                    disabled={state.devices.length <= 1}
                    aria-label="Plato anterior"
                  >
                    ◀
                  </button>
                  <div className="flex min-w-[108px] items-center justify-center text-center leading-none">
                    <span className="text-sm font-semibold text-slate-800">
                      {selectedDeviceTestLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => cycleDevice(1)}
                    className="text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
                    disabled={state.devices.length <= 1}
                    aria-label="Siguiente plato"
                  >
                    ▶
                  </button>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full border ${selectorDotClass}`}
                    title={
                      selectorPowerState === "on"
                        ? "Prendido"
                        : selectorPowerState === "off"
                          ? "Apagado"
                          : "Sin vinculación"
                    }
                  />
                  {isReadingsLoading ? "Actualizando..." : "En tiempo real"}
                </span>
                <div className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
                  {CHART_RANGES.map((range) => {
                    const isActive = selectedRange === range.key;
                    return (
                      <button
                        key={range.key}
                        type="button"
                        onClick={() => setSelectedRange(range.key)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
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
                  accent="#EBB7AA"
                  latestValue={latestWeightValue}
                  rangeStartLabel={selectedRangeConfig.fromLabel}
                  maxPoints={selectedRangeConfig.maxPoints}
                />
                <ChartCard
                  title="Temperatura"
                  unit="°C"
                  series={tempSeries}
                  accent="#D99686"
                  latestValue={latestTempValue}
                  rangeStartLabel={selectedRangeConfig.fromLabel}
                  maxPoints={selectedRangeConfig.maxPoints}
                  integerDisplay
                />
                <ChartCard
                  title="Luz entorno"
                  unit="%"
                  series={lightSeries}
                  accent="hsl(44 90% 52%)"
                  latestValue={latestLightValue}
                  rangeStartLabel={selectedRangeConfig.fromLabel}
                  maxPoints={selectedRangeConfig.maxPoints}
                  className="lg:col-start-1"
                />
                <ChartCard
                  title="Humedad"
                  unit="%"
                  series={humiditySeries}
                  accent="hsl(198 70% 45%)"
                  latestValue={latestHumidityValue}
                  rangeStartLabel={selectedRangeConfig.fromLabel}
                  maxPoints={selectedRangeConfig.maxPoints}
                  integerDisplay
                  className="lg:col-start-2"
                />
              </div>
            )}
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
                <p className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <BatteryStatusIcon level={batteryLevelValue} />
                  {batterySummary}
                </p>
                {batteryExtra ? (
                  <p className="mt-1 text-xs text-slate-500">{batteryExtra}</p>
                ) : null}
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
                  {batterySummary === "Sin datos"
                    ? "Sin datos de batería."
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
