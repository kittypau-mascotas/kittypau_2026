"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getValidAccessToken, signOutSession } from "@/lib/auth/token";
import { chileCompactDatetime } from "@/lib/time/chile";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { syncSelectedDevice } from "@/lib/runtime/selection-sync";
import Alert from "@/app/_components/alert";
import EmptyState from "@/app/_components/empty-state";
import OperationalActionsCard from "@/app/_components/operational-actions-card";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import { buildSeries, ChartCard } from "@/lib/charts";
import { formatBatterySourceLabel } from "@/lib/battery/contract";

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

type ApiPet = { id: string; name: string };

type LoadState = {
  isLoading: boolean;
  error: string | null;
  devices: ApiDevice[];
};

type ChartRangeKey = "5m" | "15m" | "1h" | "1d" | "3d" | "1w";

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
  maxPages: number;
  bucketMs: number; // 0 = raw; >0 = promedio por intervalo (server-side para 1d/1w)
  bucketS: number; // bucket_s para /api/readings/bucketed (0 = no usar endpoint bucketed)
  maxPoints: number;
  fromLabel: string;
}[] = [
  {
    key: "5m",
    label: "5 min",
    windowMs: 5 * 60 * 1000,
    queryLimit: 120,
    maxPages: 1,
    bucketMs: 0,
    bucketS: 0,
    maxPoints: 30,
    fromLabel: "-5m",
  },
  {
    key: "15m",
    label: "15 min",
    windowMs: 15 * 60 * 1000,
    queryLimit: 220,
    maxPages: 1,
    bucketMs: 0,
    bucketS: 0,
    maxPoints: 60,
    fromLabel: "-15m",
  },
  {
    key: "1h",
    label: "1 hora",
    windowMs: 60 * 60 * 1000,
    queryLimit: 420,
    maxPages: 1,
    bucketMs: 0,
    bucketS: 0,
    maxPoints: 120,
    fromLabel: "-1h",
  },
  {
    // 24h: bucket server-side de 5 min → 288 puntos exactos
    key: "1d",
    label: "1 dia",
    windowMs: 24 * 60 * 60 * 1000,
    queryLimit: 5000,
    maxPages: 1,
    bucketMs: 5 * 60 * 1000,
    bucketS: 300,
    maxPoints: 300,
    fromLabel: "-1d",
  },
  {
    // 3d (free max): bucket 15 min → 288 pts para 3 días
    key: "3d",
    label: "3 dias",
    windowMs: 3 * 24 * 60 * 60 * 1000,
    queryLimit: 5000,
    maxPages: 1,
    bucketMs: 15 * 60 * 1000,
    bucketS: 900,
    maxPoints: 300,
    fromLabel: "-3d",
  },
  {
    // 7d: bucket server-side de 30 min → 336 puntos exactos (premium)
    key: "1w",
    label: "1 semana",
    windowMs: 7 * 24 * 60 * 60 * 1000,
    queryLimit: 5000,
    maxPages: 4,
    bucketMs: 30 * 60 * 1000,
    bucketS: 1800,
    maxPoints: 340,
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
  return chileCompactDatetime(value);
};

const batteryLabel = (battery: number | null) => {
  if (battery === null || Number.isNaN(battery)) return "Sin datos";
  if (battery <= 15) return "Crítica";
  if (battery <= 35) return "Baja";
  if (battery <= 70) return "Media";
  return "Óptima";
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
  const [isTaring, setIsTaring] = useState(false);
  const [tareStatus, setTareStatus] = useState<"ok" | "error" | null>(null);
  const [userPlan, setUserPlan] = useState<"free" | "premium">("free");
  const [showConfig, setShowConfig] = useState(false);
  const [configPets, setConfigPets] = useState<ApiPet[]>([]);
  const [configPetId, setConfigPetId] = useState("");
  const [configDeviceType, setConfigDeviceType] = useState<
    "food_bowl" | "water_bowl"
  >("food_bowl");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveStatus, setConfigSaveStatus] = useState<
    "ok" | "error" | null
  >(null);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [isAddingWifi, setIsAddingWifi] = useState(false);
  const [wifiAddStatus, setWifiAddStatus] = useState<"ok" | "error" | null>(
    null,
  );
  const [knownWifiSsids, setKnownWifiSsids] = useState<string[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<number>(30_000);
  const [isSettingInterval, setIsSettingInterval] = useState(false);
  const [intervalStatus, setIntervalStatus] = useState<"ok" | "error" | null>(
    null,
  );
  const [removingWifiSsid, setRemovingWifiSsid] = useState<string | null>(null);

  const loadDevices = async (token: string) => {
    const res = await fetch(`/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar los dispositivos.");
    const payload = await res.json();
    return parseListResponse<ApiDevice>(payload);
  };

  // Versión paginada: concatena páginas hasta cubrir la ventana completa
  const loadReadingsAll = async (
    deviceId: string,
    token: string,
    windowMs: number,
    pageSize: number,
    maxPages: number,
  ): Promise<ApiReading[]> => {
    const from = new Date(Date.now() - windowMs).toISOString();
    const all: ApiReading[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({
        device_id: deviceId,
        limit: String(pageSize),
        from,
      });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/readings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) break;
      const payload = (await res.json()) as {
        data?: ApiReading[];
        next_cursor?: string | null;
      };
      const page_data = payload.data ?? [];
      all.push(...page_data);
      cursor = payload.next_cursor ?? null;
      if (!cursor || page_data.length < pageSize) break;
    }
    return all;
  };

  // Endpoint aggregado server-side para rangos largos (1d, 1w)
  const loadReadingsBucketed = async (
    deviceId: string,
    token: string,
    windowMs: number,
    bucketS: number,
  ): Promise<ApiReading[]> => {
    const from = new Date(Date.now() - windowMs).toISOString();
    const params = new URLSearchParams({
      device_id: deviceId,
      from,
      bucket_s: String(bucketS),
    });
    const res = await fetch(`/api/readings/bucketed?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar lecturas.");
    const payload = (await res.json()) as { data?: ApiReading[] };
    return payload.data ?? [];
  };

  // Carga de devices: solo se ejecuta al montar el componente.
  // Las lecturas son responsabilidad del siguiente useEffect (deps: selectedDeviceId + selectedRange).
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const token = await getValidAccessToken();
      if (!token) {
        await signOutSession();
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
        const [devices, profileRes] = await Promise.all([
          loadDevices(token),
          fetch("/api/profiles", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (mounted && profileRes.ok) {
          const pRaw = await profileRes.json();
          const pData = Array.isArray(pRaw) ? pRaw[0] : pRaw;
          const plan = (pData as { plan?: string })?.plan;
          if (plan === "premium") setUserPlan("premium");
        }
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
        const readingData =
          selectedConfig.bucketS > 0
            ? await loadReadingsBucketed(
                selectedDeviceId,
                token,
                selectedConfig.windowMs,
                selectedConfig.bucketS,
              )
            : await loadReadingsAll(
                selectedDeviceId,
                token,
                selectedConfig.windowMs,
                selectedConfig.queryLimit,
                selectedConfig.maxPages,
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
        // Para rangos largos el polling no aplica (son datos históricos estáticos)
        if (selectedConfig.bucketS > 0) return;
        const readingData = await loadReadingsAll(
          selectedDeviceId,
          token,
          selectedConfig.windowMs,
          selectedConfig.queryLimit,
          selectedConfig.maxPages,
        );
        if (!active) return;
        // Merge con lecturas existentes para no pisar las que llegaron por WebSocket
        setReadings((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const incoming = readingData.filter((r) => !existingIds.has(r.id));
          if (!incoming.length) return prev;
          return [...incoming, ...prev].slice(0, READINGS_BUFFER_MAX);
        });
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

  const handleTare = async () => {
    if (!selectedDevice?.id || isTaring) return;
    setIsTaring(true);
    setTareStatus(null);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("No autenticado");
      const res = await fetch(`/api/devices/${selectedDevice.id}/tare`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTareStatus(res.ok ? "ok" : "error");
    } catch {
      setTareStatus("error");
    } finally {
      setIsTaring(false);
      setTimeout(() => setTareStatus(null), 3000);
    }
  };

  const handleSetInterval = async () => {
    if (!selectedDevice?.id || isSettingInterval) return;
    setIsSettingInterval(true);
    setIntervalStatus(null);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("No autenticado");
      const res = await fetch(`/api/devices/${selectedDevice.id}/interval`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value_ms: selectedInterval }),
      });
      setIntervalStatus(res.ok ? "ok" : "error");
    } catch {
      setIntervalStatus("error");
    } finally {
      setIsSettingInterval(false);
      setTimeout(() => setIntervalStatus(null), 3000);
    }
  };

  const handleOpenConfig = async () => {
    if (!selectedDevice) return;
    setConfigPetId(selectedDevice.pet_id ?? "");
    setConfigDeviceType(
      selectedDevice.device_type === "water_bowl" ? "water_bowl" : "food_bowl",
    );
    setConfigSaveStatus(null);
    try {
      const token = await getValidAccessToken();
      if (!token) return;
      const res = await fetch("/api/pets?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : (payload.data ?? []);
        setConfigPets(list as ApiPet[]);
      }
    } catch {
      /* mostrar modal igual */
    }
    // Cargar lista de SSIDs conocidos guardados localmente
    try {
      const stored = localStorage.getItem(
        `kp_wifi_${selectedDevice.device_id}`,
      );
      setKnownWifiSsids(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      setKnownWifiSsids([]);
    }
    setWifiSsid("");
    setWifiPass("");
    setWifiAddStatus(null);
    setShowConfig(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedDevice?.id || isSavingConfig) return;
    setIsSavingConfig(true);
    setConfigSaveStatus(null);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("No autenticado");
      const body: Record<string, string> = { device_type: configDeviceType };
      if (configPetId) body.pet_id = configPetId;
      const res = await fetch(`/api/devices/${selectedDevice.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = (await res.json()) as ApiDevice;
      setState((prev) => ({
        ...prev,
        devices: prev.devices.map((d) => (d.id === updated.id ? updated : d)),
      }));
      setConfigSaveStatus("ok");
      setTimeout(() => setConfigSaveStatus(null), 2500);
    } catch {
      setConfigSaveStatus("error");
      setTimeout(() => setConfigSaveStatus(null), 2500);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAddWifi = async () => {
    if (!selectedDevice?.id || isAddingWifi || !wifiSsid.trim()) return;
    setIsAddingWifi(true);
    setWifiAddStatus(null);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("No autenticado");
      const res = await fetch(`/api/devices/${selectedDevice.id}/wifi`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ssid: wifiSsid.trim(), pass: wifiPass }),
      });
      if (!res.ok) throw new Error("Error");
      setWifiAddStatus("ok");
      const newSsid = wifiSsid.trim();
      setKnownWifiSsids((prev) => {
        const updated = prev.includes(newSsid) ? prev : [...prev, newSsid];
        try {
          localStorage.setItem(
            `kp_wifi_${selectedDevice.device_id}`,
            JSON.stringify(updated),
          );
        } catch {
          /* ignore */
        }
        return updated;
      });
      setWifiSsid("");
      setWifiPass("");
      setTimeout(() => setWifiAddStatus(null), 3000);
    } catch {
      setWifiAddStatus("error");
      setTimeout(() => setWifiAddStatus(null), 3000);
    } finally {
      setIsAddingWifi(false);
    }
  };

  const handleRemoveWifi = async (ssid: string) => {
    if (!selectedDevice?.id || removingWifiSsid) return;
    setRemovingWifiSsid(ssid);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("No autenticado");
      const res = await fetch(`/api/devices/${selectedDevice.id}/wifi`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ssid }),
      });
      if (!res.ok) throw new Error("Error");
      setKnownWifiSsids((prev) => {
        const updated = prev.filter((s) => s !== ssid);
        try {
          localStorage.setItem(
            `kp_wifi_${selectedDevice.device_id}`,
            JSON.stringify(updated),
          );
        } catch {
          /* ignore */
        }
        return updated;
      });
    } catch {
      /* silencioso — el usuario puede reintentar */
    } finally {
      setRemovingWifiSsid(null);
    }
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
      return "Se detectó un riesgo operativo. Revisa batería, conexión y última señal.";
    }
    if (statusSummary.tone === "ok") {
      return "Plato estable y conectado. Todo en orden.";
    }
    return "Todavía no hay suficientes lecturas para un diagnóstico completo. Cuando el plato siga publicando datos, aquí verás una lectura más precisa.";
  }, [selectedDevice, statusSummary.tone]);

  // Rangos disponibles según plan: free → hasta 3d; premium → hasta 1w
  const visibleRanges = useMemo(
    () =>
      CHART_RANGES.filter((r) =>
        userPlan === "premium" ? r.key !== "3d" : r.key !== "1w",
      ),
    [userPlan],
  );

  const selectedRangeConfig = useMemo(() => {
    // Si el rango seleccionado no está disponible para el plan, usar el último disponible
    return (
      visibleRanges.find((r) => r.key === selectedRange) ??
      visibleRanges[visibleRanges.length - 1] ??
      CHART_RANGES[0]
    );
  }, [selectedRange, visibleRanges]);

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
    formatBatterySourceLabel(batterySourceValue),
    typeof batteryVoltageValue === "number"
      ? `${batteryVoltageValue.toFixed(2)}V`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const showOperationalFallback =
    readingsError || batterySummary === "Sin datos";

  const weightSeries = useMemo(
    () =>
      buildSeries(
        readings,
        (r) => r.weight_grams,
        selectedRangeConfig.windowMs,
        selectedRangeConfig.bucketMs,
      ),
    [readings, selectedRangeConfig.windowMs, selectedRangeConfig.bucketMs],
  );
  const tempSeries = useMemo(
    () =>
      buildSeries(
        readings,
        (r) => r.temperature,
        selectedRangeConfig.windowMs,
        selectedRangeConfig.bucketMs,
      ),
    [readings, selectedRangeConfig.windowMs, selectedRangeConfig.bucketMs],
  );
  const humiditySeries = useMemo(
    () =>
      buildSeries(
        readings,
        (r) => r.humidity,
        selectedRangeConfig.windowMs,
        selectedRangeConfig.bucketMs,
      ),
    [readings, selectedRangeConfig.windowMs, selectedRangeConfig.bucketMs],
  );
  const lightSeries = useMemo(
    () =>
      buildSeries(
        readings,
        (r) => r.light_percent,
        selectedRangeConfig.windowMs,
        selectedRangeConfig.bucketMs,
      ),
    [readings, selectedRangeConfig.windowMs, selectedRangeConfig.bucketMs],
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
                {/* Selector intervalo escaneo */}
                <div className="flex items-center gap-1">
                  <select
                    value={selectedInterval}
                    onChange={(e) =>
                      setSelectedInterval(Number(e.target.value))
                    }
                    disabled={!selectedDevice}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 focus:outline-none disabled:opacity-40"
                  >
                    <option value={1_000}>1 s</option>
                    <option value={5_000}>5 s</option>
                    <option value={15_000}>15 s</option>
                    <option value={30_000}>30 s</option>
                    <option value={60_000}>1 min</option>
                    <option value={300_000}>5 min</option>
                    <option value={1_500_000}>25 min</option>
                    <option value={1_800_000}>30 min</option>
                    <option value={3_600_000}>1 h</option>
                    <option value={7_200_000}>2 h</option>
                    <option value={14_400_000}>4 h</option>
                    <option value={21_600_000}>6 h</option>
                    <option value={43_200_000}>12 h</option>
                    <option value={86_400_000}>24 h</option>
                    <option value={604_800_000}>1 semana</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleSetInterval()}
                    disabled={isSettingInterval || !selectedDevice}
                    title="Aplicar intervalo de escaneo"
                    className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                  >
                    {isSettingInterval ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                    ) : intervalStatus === "ok" ? (
                      <span className="text-emerald-600">✓</span>
                    ) : intervalStatus === "error" ? (
                      <span className="text-red-500">✗</span>
                    ) : (
                      <span>↻</span>
                    )}
                    Escaneo
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void handleOpenConfig()}
                  disabled={!selectedDevice}
                  title="Configurar dispositivo"
                  aria-label="Configurar dispositivo"
                  className="flex items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-slate-300 hover:text-slate-800 disabled:opacity-40"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
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
                  {visibleRanges.map((range) => {
                    const isActive = selectedRangeConfig.key === range.key;
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
                <div className="relative">
                  <ChartCard
                    title="Peso"
                    unit="g"
                    series={weightSeries}
                    accent="hsl(350 65% 62%)"
                    latestValue={latestWeightValue}
                    rangeStartLabel={selectedRangeConfig.fromLabel}
                    maxPoints={selectedRangeConfig.maxPoints}
                    integerDisplay
                  />
                  <button
                    type="button"
                    onClick={() => void handleTare()}
                    disabled={isTaring || !selectedDevice}
                    title="Tarar báscula (poner a cero)"
                    className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isTaring ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                    ) : tareStatus === "ok" ? (
                      <span className="text-emerald-600">✓</span>
                    ) : tareStatus === "error" ? (
                      <span className="text-red-500">✗</span>
                    ) : (
                      <span>⊖</span>
                    )}
                    Tarar
                  </button>
                </div>
                <ChartCard
                  title="Temperatura"
                  unit="°C"
                  series={tempSeries}
                  accent="hsl(25 80% 52%)"
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
                  integerDisplay
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

            {showOperationalFallback ? (
              <OperationalActionsCard
                description="Si faltan datos o energía, sigue por la vista operativa."
                actions={[
                  { href: "/today", label: "Ver hoy" },
                  { href: "/story", label: "Abrir diario" },
                  { href: "/admin", label: "Ver admin" },
                ]}
              />
            ) : null}
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
      {/* ── Modal de configuración ── */}
      {showConfig && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setShowConfig(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-slate-400">
                  Configuración
                </p>
                <p className="text-base font-semibold text-slate-900">
                  {selectedDevice?.device_id ?? "Dispositivo"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* ── Sección 1: Báscula ── */}
            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Báscula
              </p>
              <button
                type="button"
                onClick={() => void handleTare()}
                disabled={isTaring}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <span>Tarar báscula</span>
                <span>
                  {isTaring ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                  ) : tareStatus === "ok" ? (
                    <span className="text-emerald-600">✓</span>
                  ) : tareStatus === "error" ? (
                    <span className="text-red-500">✗</span>
                  ) : (
                    <span className="text-slate-400">⊖</span>
                  )}
                </span>
              </button>
            </div>

            {/* ── Sección 2: Asignación ── */}
            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Asignación
              </p>
              <div className="mb-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Mascota
                </label>
                <select
                  value={configPetId}
                  onChange={(e) => setConfigPetId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none"
                >
                  <option value="">— Sin asignar —</option>
                  {configPets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Tipo de plato
                </label>
                <select
                  value={configDeviceType}
                  onChange={(e) =>
                    setConfigDeviceType(
                      e.target.value as "food_bowl" | "water_bowl",
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none"
                >
                  <option value="food_bowl">Comedero</option>
                  <option value="water_bowl">Bebedero</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveConfig()}
                disabled={isSavingConfig}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {isSavingConfig ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : configSaveStatus === "ok" ? (
                  "✓ Guardado"
                ) : configSaveStatus === "error" ? (
                  "✗ Error al guardar"
                ) : (
                  "Guardar"
                )}
              </button>
            </div>

            {/* ── Sección 3: WiFi ── */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Redes WiFi
              </p>

              {/* Lista de redes conocidas */}
              {knownWifiSsids.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1.5 text-xs font-medium text-slate-600">
                    Redes guardadas
                  </p>
                  <ul className="space-y-1.5">
                    {knownWifiSsids.map((ssid) => (
                      <li
                        key={ssid}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <span className="truncate text-sm text-slate-700">
                          {ssid}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveWifi(ssid)}
                          disabled={removingWifiSsid === ssid}
                          className="ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40"
                        >
                          {removingWifiSsid === ssid ? (
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-500" />
                          ) : (
                            "Eliminar"
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formulario para añadir nueva red */}
              <div className="mb-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Nueva red (SSID)
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="Mi red WiFi"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-violet-400 focus:outline-none"
                />
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  placeholder="Contraseña"
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-violet-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleAddWifi()}
                disabled={isAddingWifi || !wifiSsid.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isAddingWifi ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : wifiAddStatus === "ok" ? (
                  "✓ Red enviada al dispositivo"
                ) : wifiAddStatus === "error" ? (
                  "✗ Error al enviar"
                ) : (
                  "Agregar red"
                )}
              </button>
              <p className="mt-2 text-[11px] text-slate-400">
                El dispositivo guardará esta red y la usará en próximas
                conexiones.
              </p>
            </div>

            {/* ── Sección 4: Intervalo de muestreo ── */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Intervalo de muestreo
              </p>
              <select
                value={selectedInterval}
                onChange={(e) => setSelectedInterval(Number(e.target.value))}
                className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none"
              >
                <option value={1_000}>1 segundo</option>
                <option value={5_000}>5 segundos</option>
                <option value={15_000}>15 segundos</option>
                <option value={30_000}>30 segundos</option>
                <option value={60_000}>1 minuto</option>
                <option value={300_000}>5 minutos</option>
                <option value={1_500_000}>25 minutos</option>
                <option value={1_800_000}>30 minutos</option>
                <option value={3_600_000}>1 hora</option>
                <option value={7_200_000}>2 horas</option>
                <option value={14_400_000}>4 horas</option>
                <option value={21_600_000}>6 horas</option>
                <option value={43_200_000}>12 horas</option>
                <option value={86_400_000}>24 horas</option>
                <option value={604_800_000}>1 semana</option>
              </select>
              <button
                type="button"
                onClick={() => void handleSetInterval()}
                disabled={isSettingInterval}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {isSettingInterval ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : intervalStatus === "ok" ? (
                  "✓ Aplicado"
                ) : intervalStatus === "error" ? (
                  "✗ Error"
                ) : (
                  "Aplicar"
                )}
              </button>
              <p className="mt-2 text-[11px] text-slate-400">
                El dispositivo recibirá el nuevo intervalo y lo guardará en
                memoria.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
