"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";
import { authFetch } from "@/lib/auth/auth-fetch";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";

type ApiPet = {
  id: string;
  name: string;
  pet_state?: string | null;
  photo_url?: string | null;
};

type ApiProfile = {
  user_name?: string | null;
  owner_name?: string | null;
  is_owner?: boolean | null;
  photo_url?: string | null;
};

type ApiDevice = {
  id: string;
  pet_id: string;
  device_id: string;
  device_type: string;
  plate_weight_grams?: number | null;
  status: string;
  device_state: string | null;
  battery_level: number | null;
  last_seen: string | null;
};

type ApiReading = {
  id: string;
  device_id: string;
  recorded_at: string;
  weight_grams: number | null;
  water_ml: number | null;
  flow_rate: number | null;
  temperature: number | null;
  humidity: number | null;
  battery_level: number | null;
};

type DayNightPoint = { x: number; y: number };

type DeviceReadingsMap = Record<string, ApiReading[]>;

type StatCard = {
  label: string;
  value: string;
  icon?: string;
};

type LoadState = {
  isLoading: boolean;
  error: string | null;
  pets: ApiPet[];
  devices: ApiDevice[];
  profile: ApiProfile | null;
  readings: ApiReading[];
  readingsCursor: string | null;
  isLoadingMore: boolean;
};

const defaultState: LoadState = {
  isLoading: true,
  error: null,
  pets: [],
  devices: [],
  profile: null,
  readings: [],
  readingsCursor: null,
  isLoadingMore: false,
};

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

function formatTimestamp(value?: string | null) {
  if (!value) return "Sin datos";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin datos";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getFreshnessLabelByTimestamp(value?: string | null) {
  if (!value) return "Sin datos";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "Sin datos";
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin <= 2) return "Muy reciente";
  if (diffMin <= 10) return "Reciente";
  if (diffMin <= 30) return "Moderado";
  return "Desactualizado";
}

function resolveDevicePowerState(
  device: Pick<ApiDevice, "device_state" | "status"> | null | undefined
): "on" | "off" | "nodata" {
  if (!device) return "nodata";
  const state = (device.device_state ?? "").toLowerCase();
  const status = (device.status ?? "").toLowerCase();
  if (!state && !status) return "nodata";
  if (state.includes("offline") || status === "offline" || status === "inactive") {
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
}

function parsePetNumberSuffix(petName: string | null | undefined): number | null {
  if (!petName) return null;
  const match = petName.match(/test[_\s-]*(\d{3,4})/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function kpclLabelFromNumber(value: number): string {
  return `KPCL${String(value).padStart(4, "0")}`;
}

function toNullableNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return value;
}

function getDayNightWindow(now = new Date()) {
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);
  if (now.getTime() < start.getTime()) {
    start.setDate(start.getDate() - 1);
  }
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}

function formatHourFromOffset(offsetHours: number) {
  const rounded = Math.round(offsetHours);
  const hour = ((9 + rounded) % 24 + 24) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

function isBoundaryHour(value: number) {
  const epsilon = 0.02;
  const boundaries = [0, 6, 12, 18, 24];
  return boundaries.some((boundary) => Math.abs(value - boundary) <= epsilon);
}

function toDayNightPoints(
  readings: ApiReading[],
  startMs: number,
  endMs: number,
  valueSelector: (reading: ApiReading) => number | null
): DayNightPoint[] {
  return readings
    .map((reading) => {
      const ts = new Date(reading.recorded_at).getTime();
      const value = valueSelector(reading);
      if (Number.isNaN(ts) || ts < startMs || ts > endMs || value === null) return null;
      return {
        x: (ts - startMs) / (60 * 60 * 1000),
        y: value,
      };
    })
    .filter((item): item is DayNightPoint => Boolean(item))
    .sort((a, b) => a.x - b.x);
}

export default function TodayPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [isPetMenuOpen, setIsPetMenuOpen] = useState(false);
  const [deviceLatestReadings, setDeviceLatestReadings] = useState<Record<string, ApiReading | null>>({});
  const [devicePreviousReadings, setDevicePreviousReadings] = useState<Record<string, ApiReading | null>>({});
  const [deviceChartReadings, setDeviceChartReadings] = useState<DeviceReadingsMap>({});
  const [chartLoadError, setChartLoadError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    getValidAccessToken().then((value) => {
      if (mounted) setIsAuthed(Boolean(value));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const parseListResponse = <T,>(payload: unknown): T[] => {
    if (Array.isArray(payload)) {
      return payload as T[];
    }
    if (payload && typeof payload === "object" && "data" in payload) {
      return (payload as { data?: T[] }).data ?? [];
    }
    return [];
  };

  const parseCursor = (payload: unknown): string | null => {
    if (payload && typeof payload === "object" && "next_cursor" in payload) {
      return (payload as { next_cursor?: string | null }).next_cursor ?? null;
    }
    return null;
  };

  const parseProfile = (payload: unknown): ApiProfile | null => {
    if (!payload || typeof payload !== "object") return null;
    if (Array.isArray(payload)) {
      return (payload[0] as ApiProfile) ?? null;
    }
    return payload as ApiProfile;
  };

  const loadReadings = async (
    deviceId: string,
    cursor?: string | null,
    limit = 50
  ) => {
    const params = new URLSearchParams({
      device_id: deviceId,
      limit: String(limit),
    });
    if (cursor) params.set("cursor", cursor);
    const res = await authFetch(`/api/readings?${params.toString()}`);
    if (!res.ok) {
      throw new Error("No se pudieron cargar las lecturas.");
    }
    const payload = await res.json();
    return {
      data: parseListResponse<ApiReading>(payload),
      nextCursor: parseCursor(payload),
    };
  };

  useEffect(() => {
    if (isAuthed === false) {
      setState({
        isLoading: false,
        error: "Necesitas iniciar sesión para ver tu feed.",
        pets: [],
        devices: [],
        profile: null,
        readings: [],
        readingsCursor: null,
        isLoadingMore: false,
      });
      return;
    }

    if (isAuthed === null) return;

    const load = async () => {
      try {
        const [petsRes, devicesRes, profileRes] = await Promise.all([
          authFetch("/api/pets?limit=20"),
          authFetch("/api/devices?limit=20"),
          authFetch("/api/profiles"),
        ]);

        if (!petsRes.ok) {
          throw new Error("No se pudieron cargar las mascotas.");
        }
        if (!devicesRes.ok) {
          throw new Error("No se pudieron cargar los dispositivos.");
        }
        if (!profileRes.ok) {
          throw new Error("No se pudo cargar el perfil.");
        }

        const petsPayload = await petsRes.json();
        const devicesPayload = await devicesRes.json();
        const profilePayload = await profileRes.json();

        const pets = parseListResponse<ApiPet>(petsPayload);
        const devices = parseListResponse<ApiDevice>(devicesPayload);
        const profile = parseProfile(profilePayload);

        const storedPetId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("kittypau_pet_id")
            : null;
        const primaryPet =
          pets.find((pet) => pet.id === storedPetId) ??
          pets[0];
        const storedDeviceId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("kittypau_device_id")
            : null;
        const petSuffix = parsePetNumberSuffix(primaryPet?.name);
        const expectedFoodDeviceId = petSuffix ? kpclLabelFromNumber(petSuffix) : null;
        const primaryDevice =
          devices.find((device) => device.id === storedDeviceId) ??
          devices.find((device) => (device.device_id ?? "").toUpperCase() === expectedFoodDeviceId) ??
          devices.find((device) => device.pet_id === primaryPet?.id) ??
          devices[0];

        let readings: ApiReading[] = [];
        let readingsCursor: string | null = null;
        const initialDeviceId = primaryDevice?.id ?? null;
        setSelectedPetId(primaryPet?.id ?? null);
        setSelectedDeviceId(initialDeviceId);
        if (primaryPet?.id && typeof window !== "undefined") {
          window.localStorage.setItem("kittypau_pet_id", primaryPet.id);
        }
        if (initialDeviceId && typeof window !== "undefined") {
          window.localStorage.setItem("kittypau_device_id", initialDeviceId);
        }
        if (initialDeviceId) {
          const result = await loadReadings(initialDeviceId);
          readings = result.data;
          readingsCursor = result.nextCursor;
          setLastRefreshAt(new Date().toISOString());
        }

        setState({
          isLoading: false,
          error: null,
          pets,
          devices,
          profile,
          readings,
          readingsCursor,
          isLoadingMore: false,
        });
      } catch (err) {
        setState({
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "No se pudo cargar la información.",
          pets: [],
          devices: [],
          profile: null,
          readings: [],
          readingsCursor: null,
          isLoadingMore: false,
        });
      }
    };

    void load();
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed || typeof window === "undefined") return;
    const seen = window.localStorage.getItem("kittypau_guide_seen");
    if (!seen) {
      setShowGuide(true);
    }
  }, [isAuthed]);

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
        .channel(`readings:${selectedDeviceId}`)
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
            setState((prev) => {
              const exists = prev.readings.some(
                (reading) => reading.id === nextReading.id
              );
              if (exists) return prev;
              return {
                ...prev,
                readings: [nextReading, ...prev.readings].slice(0, 120),
              };
            });
            setLastRefreshAt(new Date().toISOString());
            setRefreshError(null);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onDeviceChange = async (event: Event) => {
      const custom = event as CustomEvent<{ deviceId?: string }>;
      const nextId = custom.detail?.deviceId ?? null;
      if (!nextId || nextId === selectedDeviceId) return;
      setSelectedDeviceId(nextId);
      try {
        const result = await loadReadings(nextId);
        setState((prev) => ({
          ...prev,
          readings: result.data,
          readingsCursor: result.nextCursor,
        }));
        setLastRefreshAt(new Date().toISOString());
        setRefreshError(null);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error:
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las lecturas.",
        }));
      }
    };
    window.addEventListener("kittypau-device-change", onDeviceChange as EventListener);
    return () => {
      window.removeEventListener("kittypau-device-change", onDeviceChange as EventListener);
    };
  }, [selectedDeviceId]);

  const loadMoreReadings = async () => {
    const deviceId = selectedDeviceId;
    if (!deviceId || !state.readingsCursor || state.isLoadingMore) {
      return;
    }
    setState((prev) => ({ ...prev, isLoadingMore: true }));
    try {
      const result = await loadReadings(deviceId, state.readingsCursor);
      setState((prev) => ({
        ...prev,
        readings: [...prev.readings, ...result.data],
        readingsCursor: result.nextCursor,
        isLoadingMore: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error
            ? err.message
            : "No se pudieron cargar más lecturas.",
        isLoadingMore: false,
      }));
    }
  };

  const primaryPet =
    state.pets.find((pet) => pet.id === selectedPetId) ??
    state.pets[0];
  const selectedPetSuffix = parsePetNumberSuffix(primaryPet?.name);
  const expectedFoodDeviceCode = selectedPetSuffix ? kpclLabelFromNumber(selectedPetSuffix) : null;
  const expectedWaterDeviceCode = selectedPetSuffix
    ? kpclLabelFromNumber(selectedPetSuffix + 1)
    : null;
  const petDevices = useMemo(() => {
    const base = state.devices.filter((device) => device.pet_id === primaryPet?.id);
    const byFoodCode = expectedFoodDeviceCode
      ? state.devices.find(
          (device) => (device.device_id ?? "").toUpperCase() === expectedFoodDeviceCode
        )
      : null;
    const byWaterCode = expectedWaterDeviceCode
      ? state.devices.find(
          (device) => (device.device_id ?? "").toUpperCase() === expectedWaterDeviceCode
        )
      : null;
    const merged = [...base];
    if (byFoodCode && !merged.some((item) => item.id === byFoodCode.id)) merged.push(byFoodCode);
    if (byWaterCode && !merged.some((item) => item.id === byWaterCode.id)) merged.push(byWaterCode);
    return merged;
  }, [state.devices, primaryPet?.id, expectedFoodDeviceCode, expectedWaterDeviceCode]);
  const ownerLabel =
    state.profile?.owner_name ||
    state.profile?.user_name ||
    "tu";
  const petLabel = primaryPet?.name ?? "tu mascota";
  const primaryDevice =
    petDevices.find((device) => device.id === selectedDeviceId) ??
    petDevices.find(
      (device) => (device.device_id ?? "").toUpperCase() === expectedFoodDeviceCode
    ) ??
    petDevices[0] ??
    state.devices.find((device) => device.id === selectedDeviceId) ??
    state.devices[0];
  const bowlDevice =
    petDevices.find(
      (device) => (device.device_id ?? "").toUpperCase() === expectedFoodDeviceCode
    ) ??
    petDevices.find(
      (device) =>
        device.device_id?.toUpperCase().includes("KPCL") ||
        (device.device_type ?? "").toLowerCase().includes("comedero")
    ) ?? primaryDevice;
  const waterDevice =
    petDevices.find(
      (device) => (device.device_id ?? "").toUpperCase() === expectedWaterDeviceCode
    ) ??
    petDevices.find((device) => {
      const id = (device.device_id ?? "").toUpperCase();
      const type = (device.device_type ?? "").toLowerCase();
      return (
        id.includes("KPBW") ||
        id.includes("KPW") ||
        type.includes("bebedero") ||
        type.includes("water")
      );
    }) ?? null;
  const latestReading = state.readings[0] ?? null;
  const bowlLatestReading = bowlDevice?.id ? (deviceLatestReadings[bowlDevice.id] ?? null) : null;
  const bowlPreviousReading = bowlDevice?.id ? (devicePreviousReadings[bowlDevice.id] ?? null) : null;
  const waterLatestReading = waterDevice?.id ? (deviceLatestReadings[waterDevice.id] ?? null) : null;
  const waterPreviousReading = waterDevice?.id ? (devicePreviousReadings[waterDevice.id] ?? null) : null;
  const freshnessLabel = useMemo(
    () => getFreshnessLabelByTimestamp(latestReading?.recorded_at),
    [latestReading?.recorded_at]
  );

  useEffect(() => {
    const targetIds = [bowlDevice?.id, waterDevice?.id].filter(
      (value, index, arr): value is string =>
        Boolean(value) && arr.indexOf(value) === index
    );
    if (!targetIds.length) return;
    let active = true;
    const loadTargets = async () => {
      const entries = await Promise.all(
        targetIds.map(async (deviceId) => {
          try {
            const result = await loadReadings(deviceId, null, 2);
            return [deviceId, result.data[0] ?? null, result.data[1] ?? null] as const;
          } catch {
            return [deviceId, null, null] as const;
          }
        })
      );
      if (!active) return;
      setDeviceLatestReadings((prev) => ({
        ...prev,
        ...Object.fromEntries(entries.map(([deviceId, latest]) => [deviceId, latest])),
      }));
      setDevicePreviousReadings((prev) => ({
        ...prev,
        ...Object.fromEntries(entries.map(([deviceId, _latest, previous]) => [deviceId, previous])),
      }));
    };
    void loadTargets();
    return () => {
      active = false;
    };
  }, [bowlDevice?.id, waterDevice?.id]);

  useEffect(() => {
    const targetIds = [bowlDevice?.id, waterDevice?.id].filter(
      (value, index, arr): value is string =>
        Boolean(value) && arr.indexOf(value) === index
    );
    if (!targetIds.length) return;
    let active = true;
    const loadChartTargets = async () => {
      const entries = await Promise.all(
        targetIds.map(async (deviceId) => {
          try {
            const result = await loadReadings(deviceId, null, 240);
            return [deviceId, result.data] as const;
          } catch {
            return [deviceId, []] as const;
          }
        })
      );
      if (!active) return;
      setDeviceChartReadings((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
      const hasAnyData = entries.some(([, values]) => values.length > 0);
      setChartLoadError(hasAnyData ? null : "Sin lecturas suficientes para construir el gráfico.");
    };
    void loadChartTargets();
    return () => {
      active = false;
    };
  }, [bowlDevice?.id, waterDevice?.id]);

  const summaryText = useMemo(() => {
    if (!latestReading) {
      return `Aún no hay lecturas para ${petLabel}. Revisa el plato y vuelve aquí.`;
    }
    if (latestReading.flow_rate !== null && latestReading.flow_rate >= 140) {
      return `Hidratación elevada detectada hoy en ${petLabel}.`;
    }
    if (latestReading.weight_grams !== null && latestReading.weight_grams >= 3500) {
      return `Consumo estable en el último registro de ${petLabel}.`;
    }
    if (latestReading.temperature !== null && latestReading.temperature >= 26) {
      return `Ambiente cálido, atento a la hidratación de ${petLabel}.`;
    }
    return "Ritmo dentro de lo esperado.";
  }, [latestReading, petLabel]);

  const feedCards = useMemo(() => {
    if (!latestReading) return [];
    const items = [];
    if (latestReading.water_ml !== null || latestReading.flow_rate !== null) {
      items.push({
        title: "Hidratación",
        description:
          latestReading.flow_rate !== null
            ? `Flujo ${latestReading.flow_rate} ml/h en la última lectura.`
            : `Consumo registrado: ${latestReading.water_ml ?? 0} ml.`,
        tone: "info",
        icon: "/illustrations/green_water_full.png",
      });
    }
    if (latestReading.weight_grams !== null) {
      items.push({
        title: "Consumo de alimento",
        description: `Peso detectado: ${latestReading.weight_grams} g.`,
        tone: "ok",
        icon: "/illustrations/pink_food_full.png",
      });
    }
    if (latestReading.temperature !== null || latestReading.humidity !== null) {
      items.push({
        title: "Ambiente",
        description: `Temp ${latestReading.temperature ?? "-"}° · Humedad ${
          latestReading.humidity ?? "-"
        }%.`,
        tone: "warning",
      });
    }
    return items.slice(0, 3);
  }, [latestReading]);

  const quickStats = useMemo(() => {
    if (!latestReading) {
      return [
        { label: "Hidratación", value: "Sin datos", icon: "/illustrations/green_water_full.png" },
        { label: "Alimento", value: "Sin datos", icon: "/illustrations/pink_food_full.png" },
        { label: "Ambiente", value: "Sin datos" },
      ] as StatCard[];
    }
    const hydration =
      latestReading.flow_rate !== null
        ? `${Math.round(latestReading.flow_rate)} ml/h`
        : "Sin flujo";
    const food =
      latestReading.weight_grams !== null
        ? `${latestReading.weight_grams} g`
        : "Sin peso";
    const ambient =
      latestReading.temperature !== null && latestReading.humidity !== null
        ? `${latestReading.temperature}° · ${latestReading.humidity}%`
        : "Sin ambiente";
    return [
      { label: "Hidratación", value: hydration, icon: "/illustrations/green_water_full.png" },
      { label: "Alimento", value: food, icon: "/illustrations/pink_food_full.png" },
      { label: "Ambiente", value: ambient },
    ] as StatCard[];
  }, [latestReading]);

  const toneStyles: Record<string, string> = {
    ok: "border-emerald-200/60 bg-emerald-50/60 text-emerald-800",
    warning: "border-amber-200/60 bg-amber-50/70 text-amber-800",
    info: "border-sky-200/60 bg-sky-50/70 text-sky-800",
  };
  const bowlTempText =
    bowlLatestReading?.temperature !== null && bowlLatestReading?.temperature !== undefined
      ? `${bowlLatestReading.temperature}°C`
      : "N/D";
  const bowlHumidityText =
    bowlLatestReading?.humidity !== null && bowlLatestReading?.humidity !== undefined
      ? `${bowlLatestReading.humidity}%`
      : "N/D";
  const bowlPlateWeightGrams = toNullableNumber(bowlDevice?.plate_weight_grams);
  const bowlGrossWeightGrams = toNullableNumber(bowlLatestReading?.weight_grams);
  const bowlContentWeightGrams =
    bowlPlateWeightGrams !== null && bowlGrossWeightGrams !== null
      ? Math.max(0, bowlGrossWeightGrams - bowlPlateWeightGrams)
      : null;
  const bowlContentWeightText =
    bowlContentWeightGrams !== null ? `${Math.round(bowlContentWeightGrams)} g` : "N/D";
  const bowlPlateWeightText =
    bowlPlateWeightGrams !== null ? `${Math.round(Math.max(0, bowlPlateWeightGrams))} g` : "N/D";
  const waterTempText =
    waterLatestReading?.temperature !== null && waterLatestReading?.temperature !== undefined
      ? `${waterLatestReading.temperature}°C`
      : "N/D";
  const waterHumidityText =
    waterLatestReading?.humidity !== null && waterLatestReading?.humidity !== undefined
      ? `${waterLatestReading.humidity}%`
      : "N/D";
  const waterPlateWeightGrams = toNullableNumber(waterDevice?.plate_weight_grams);
  const waterGrossWeightGrams = toNullableNumber(waterLatestReading?.weight_grams);
  const waterContentWeightGrams =
    waterPlateWeightGrams !== null && waterGrossWeightGrams !== null
      ? Math.max(0, waterGrossWeightGrams - waterPlateWeightGrams)
      : null;
  const waterContentWeightText =
    waterContentWeightGrams !== null ? `${Math.round(waterContentWeightGrams)} g` : "N/D";
  const waterPlateWeightText =
    waterPlateWeightGrams !== null ? `${Math.round(Math.max(0, waterPlateWeightGrams))} g` : "N/D";
  const waterVolumeCm3Text =
    waterContentWeightGrams !== null ? `${Math.round(waterContentWeightGrams)} cm3` : "N/D";

  const bowlPrevGrossWeightGrams = toNullableNumber(bowlPreviousReading?.weight_grams);
  const bowlPrevContentWeightGrams =
    bowlPlateWeightGrams !== null && bowlPrevGrossWeightGrams !== null
      ? Math.max(0, bowlPrevGrossWeightGrams - bowlPlateWeightGrams)
      : null;
  const bowlPrevTemp = toNullableNumber(bowlPreviousReading?.temperature);
  const bowlPrevHumidity = toNullableNumber(bowlPreviousReading?.humidity);

  const waterPrevGrossWeightGrams = toNullableNumber(waterPreviousReading?.weight_grams);
  const waterPrevContentWeightGrams =
    waterPlateWeightGrams !== null && waterPrevGrossWeightGrams !== null
      ? Math.max(0, waterPrevGrossWeightGrams - waterPlateWeightGrams)
      : null;
  const waterPrevTemp = toNullableNumber(waterPreviousReading?.temperature);
  const waterPrevHumidity = toNullableNumber(waterPreviousReading?.humidity);

  const renderTrend = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return null;
    const delta = current - previous;
    if (Math.abs(delta) < 0.001) return null;
    const up = delta > 0;
    return (
      <span
        aria-hidden="true"
        className={`ml-1 inline-flex text-[9px] leading-none opacity-65 ${up ? "text-emerald-600" : "text-rose-600"}`}
      >
        {up ? "▲" : "▼"}
      </span>
    );
  };
  const powerDotStyles: Record<"on" | "off" | "nodata", string> = {
    on: "bg-emerald-500 border-emerald-400",
    off: "bg-rose-500 border-rose-400",
    nodata: "bg-white border-slate-300",
  };
  const bowlPowerState = resolveDevicePowerState(bowlDevice);
  const waterPowerState = resolveDevicePowerState(waterDevice);

  const dayNightWindow = useMemo(() => getDayNightWindow(new Date()), [lastRefreshAt]);
  const bowlChartReadings = bowlDevice?.id ? deviceChartReadings[bowlDevice.id] ?? [] : [];
  const waterChartReadings = waterDevice?.id ? deviceChartReadings[waterDevice.id] ?? [] : [];

  const selectBowlSeriesValue = (reading: ApiReading) => {
    const gross = toNullableNumber(reading.weight_grams);
    const plate = toNullableNumber(bowlDevice?.plate_weight_grams);
    if (gross === null) return null;
    if (plate === null) return gross;
    return Math.max(0, gross - plate);
  };

  const selectWaterSeriesValue = (reading: ApiReading) => {
    const waterMl = toNullableNumber(reading.water_ml);
    if (waterMl !== null) return Math.max(0, waterMl);
    const gross = toNullableNumber(reading.weight_grams);
    const plate = toNullableNumber(waterDevice?.plate_weight_grams);
    if (gross === null) return null;
    if (plate === null) return gross;
    return Math.max(0, gross - plate);
  };

  const bowlDayNightPoints = useMemo(
    () =>
      toDayNightPoints(
        bowlChartReadings,
        dayNightWindow.startMs,
        dayNightWindow.endMs,
        selectBowlSeriesValue
      ),
    [bowlChartReadings, dayNightWindow.endMs, dayNightWindow.startMs, bowlDevice?.plate_weight_grams]
  );

  const waterDayNightPoints = useMemo(
    () =>
      toDayNightPoints(
        waterChartReadings,
        dayNightWindow.startMs,
        dayNightWindow.endMs,
        selectWaterSeriesValue
      ),
    [waterChartReadings, dayNightWindow.endMs, dayNightWindow.startMs, waterDevice?.plate_weight_grams]
  );

  const foodPointStyle = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const img = new window.Image(28, 28);
    img.src = "/illustrations/pink_food_full.png";
    return img;
  }, []);

  const waterPointStyle = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const img = new window.Image(28, 28);
    img.src = "/illustrations/green_water_full.png";
    return img;
  }, []);

  const dayNightBackground = useMemo(() => {
    if (typeof window === "undefined") return null;
    const img = new window.Image();
    img.src = "/fondo_dia_noche.png";
    return img;
  }, []);

  const dayNightBackgroundPlugin = useMemo<Plugin<"line">>(
    () => ({
      id: "kittypau-day-night-background",
      beforeDatasetsDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea || !dayNightBackground || !dayNightBackground.complete) return;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(
          dayNightBackground,
          chartArea.left,
          chartArea.top,
          chartArea.right - chartArea.left,
          chartArea.bottom - chartArea.top
        );
        ctx.restore();
      },
    }),
    [dayNightBackground]
  );

  const dayNightChartData = useMemo<ChartData<"line", DayNightPoint[]>>(
    () => ({
      datasets: [
        {
          label: `Alimentación (${bowlDevice?.device_id ?? "KPCL"})`,
          data: bowlDayNightPoints,
          showLine: false,
          pointStyle: foodPointStyle,
          pointRadius: 8,
          pointHoverRadius: 9,
          pointBackgroundColor: "#d9468f",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.2,
        },
        {
          label: `Hidratación (${waterDevice?.device_id ?? "KPCL"})`,
          data: waterDayNightPoints,
          showLine: false,
          pointStyle: waterPointStyle,
          pointRadius: 8,
          pointHoverRadius: 9,
          pointBackgroundColor: "#0ea5e9",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.2,
        },
      ],
    }),
    [bowlDayNightPoints, bowlDevice?.device_id, foodPointStyle, waterDayNightPoints, waterDevice?.device_id, waterPointStyle]
  );

  const dayNightChartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: "#475569",
            usePointStyle: true,
            boxWidth: 14,
            boxHeight: 14,
            font: {
              size: 11,
              family: "system-ui, -apple-system, Segoe UI, sans-serif",
              weight: 600,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.9)",
          titleColor: "#fff1f2",
          bodyColor: "#e2e8f0",
          displayColors: false,
          callbacks: {
            title: (items) => {
              const point = items[0]?.parsed;
              if (!point || typeof point.x !== "number") return "Sin hora";
              const at = new Date(dayNightWindow.startMs + point.x * 60 * 60 * 1000);
              return at.toLocaleString("es-CL", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
            },
            label: (context) => {
              const value = typeof context.parsed.y === "number" ? Math.round(context.parsed.y) : null;
              const label = context.dataset.label ?? "Serie";
              if (value === null) return `${label}: N/D`;
              if (label.includes("Hidratación")) {
                return `${label}: ${value} cm3 (aprox)`;
              }
              return `${label}: ${value} g`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 24,
          grid: {
            color: "rgba(148,163,184,0.2)",
            drawBorder: false,
          },
          border: {
            color: "rgba(100,116,139,0.45)",
          },
          ticks: {
            stepSize: 1,
            color: "#475569",
            maxRotation: 0,
            minRotation: 0,
            callback: (value) => {
              const numeric = Number(value);
              if (!isBoundaryHour(numeric)) return "";
              return formatHourFromOffset(numeric);
            },
            font: {
              size: 11,
              family: "system-ui, -apple-system, Segoe UI, sans-serif",
              weight: 600,
            },
          },
        },
        y: {
          type: "linear",
          beginAtZero: true,
          ticks: {
            display: false,
          },
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
        },
      },
    }),
    [dayNightWindow.startMs]
  );

  const hasDayNightData = bowlDayNightPoints.length > 0 || waterDayNightPoints.length > 0;

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <section
            id="today-hero"
            role="region"
            aria-label="Hero estado de platos y mascota"
            className="today-hero surface-card freeform-rise px-4 py-4 md:px-6 md:py-5"
          >
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPetMenuOpen((prev) => !prev)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-900"
                  >
                    {petLabel}
                  </button>
                  {isPetMenuOpen ? (
                    <div className="absolute left-1/2 top-[calc(100%+6px)] z-20 w-52 -translate-x-1/2 rounded-[var(--radius)] border border-slate-200 bg-white p-2 shadow-lg">
                      <div className="space-y-1">
                        {state.pets.map((pet) => (
                          <button
                            key={pet.id}
                            type="button"
                            onClick={async () => {
                              const suffix = parsePetNumberSuffix(pet.name);
                              const foodCode = suffix ? kpclLabelFromNumber(suffix) : null;
                              const nextDevice =
                                state.devices.find(
                                  (device) =>
                                    (device.device_id ?? "").toUpperCase() === foodCode
                                ) ??
                                state.devices.find((device) => device.pet_id === pet.id) ??
                                null;

                              setSelectedPetId(pet.id);
                              setIsPetMenuOpen(false);
                              if (typeof window !== "undefined") {
                                window.localStorage.setItem("kittypau_pet_id", pet.id);
                              }

                              if (!nextDevice) return;
                              setSelectedDeviceId(nextDevice.id);
                              if (typeof window !== "undefined") {
                                window.localStorage.setItem("kittypau_device_id", nextDevice.id);
                              }
                              try {
                                const result = await loadReadings(nextDevice.id);
                                setState((prev) => ({
                                  ...prev,
                                  readings: result.data,
                                  readingsCursor: result.nextCursor,
                                }));
                                setLastRefreshAt(new Date().toISOString());
                                setRefreshError(null);
                              } catch (err) {
                                setRefreshError(
                                  err instanceof Error
                                    ? err.message
                                    : "No se pudieron cargar las lecturas."
                                );
                              }
                            }}
                            className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1 text-left hover:bg-slate-50"
                          >
                            <img
                              src={pet.photo_url || "/pet_profile.jpeg"}
                              alt={`Foto de ${pet.name}`}
                              className="h-6 w-6 rounded-full border border-slate-200 object-cover"
                            />
                            <span className="text-xs font-medium text-slate-700">{pet.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <Link
                  href="/pet"
                  className="inline-flex"
                  title="Ajustar foto"
                  aria-label="Ajustar foto"
                >
                  <img
                    src={primaryPet?.photo_url || "/pet_profile.jpeg"}
                    alt={`Foto de ${petLabel}`}
                    className="h-24 w-24 rounded-full object-cover border border-slate-200"
                  />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-[var(--radius)] border border-slate-200 bg-white p-3 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.45)]">
                  <div className="relative min-h-[132px]">
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <span
                        className={`inline-block h-3 w-3 rounded-full border ${powerDotStyles[bowlPowerState]}`}
                        aria-label={
                          bowlPowerState === "on"
                            ? "Prendido"
                            : bowlPowerState === "off"
                            ? "Apagado"
                            : "Sin data"
                        }
                        title={
                          bowlPowerState === "on"
                            ? "Prendido"
                            : bowlPowerState === "off"
                            ? "Apagado"
                            : "Sin data"
                        }
                      />
                      <BatteryStatusIcon level={bowlDevice?.battery_level ?? null} className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="absolute left-0 top-1/2 flex w-[96px] -translate-y-1/2 flex-col items-start gap-1">
                      <p className="text-[10px] font-semibold text-slate-700">
                        {bowlContentWeightText} (contenido)
                        {renderTrend(bowlContentWeightGrams, bowlPrevContentWeightGrams)}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-700">
                        {bowlPlateWeightText} (plato)
                      </p>
                      <p className="text-[10px] font-semibold text-slate-600">
                        {bowlTempText}
                        {renderTrend(toNullableNumber(bowlLatestReading?.temperature), bowlPrevTemp)}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        {bowlHumidityText}
                        {renderTrend(toNullableNumber(bowlLatestReading?.humidity), bowlPrevHumidity)}
                      </p>
                    </div>
                    <div className="mx-auto flex w-full max-w-[220px] flex-col items-center justify-center">
                      <img
                        src="/illustrations/pink_food_full.png"
                        alt="Kittypau comedero"
                        className="mx-auto h-28 w-40 object-contain object-center"
                      />
                      <p className="mt-0.5 text-center text-[9px] leading-none text-slate-400/80">
                        {bowlDevice?.device_id ?? "KPCLXXXX"}
                      </p>
                      <div className="mt-2 flex w-full items-start justify-center gap-2">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                          Alimentación
                        </span>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-[var(--radius)] border border-slate-200 bg-white p-3 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.45)]">
                  <div className="relative min-h-[132px]">
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <span
                        className={`inline-block h-3 w-3 rounded-full border ${powerDotStyles[waterPowerState]}`}
                        aria-label={
                          waterPowerState === "on"
                            ? "Prendido"
                            : waterPowerState === "off"
                            ? "Apagado"
                            : "Sin data"
                        }
                        title={
                          waterPowerState === "on"
                            ? "Prendido"
                            : waterPowerState === "off"
                            ? "Apagado"
                            : "Sin data"
                        }
                      />
                      <BatteryStatusIcon level={waterDevice?.battery_level ?? null} className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="absolute left-0 top-1/2 flex w-[96px] -translate-y-1/2 flex-col items-start gap-1">
                      <p className="text-[10px] font-semibold text-slate-700">
                        {waterVolumeCm3Text} (aprox)
                        {renderTrend(waterContentWeightGrams, waterPrevContentWeightGrams)}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-700">
                        {waterPlateWeightText} (plato)
                      </p>
                      <p className="text-[10px] font-semibold text-slate-600">
                        {waterTempText}
                        {renderTrend(toNullableNumber(waterLatestReading?.temperature), waterPrevTemp)}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        {waterHumidityText}
                        {renderTrend(toNullableNumber(waterLatestReading?.humidity), waterPrevHumidity)}
                      </p>
                    </div>
                    <div className="mx-auto flex w-full max-w-[220px] flex-col items-center justify-center">
                      <img
                        src="/illustrations/green_water_full.png"
                        alt="Kittypau bebedero"
                        className="mx-auto h-28 w-40 object-contain object-center"
                      />
                      <p className="mt-0.5 text-center text-[9px] leading-none text-slate-400/80">
                        {waterDevice?.device_id ?? "KPBWXXXX"}
                      </p>
                      <div className="mt-2 flex w-full items-start justify-center gap-2">
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                          Hidratación
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section className="surface-card freeform-rise px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="display-title text-xl font-semibold text-slate-900">
                  Peso vs Tiempo (Día-Noche)
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Eje X de 09:00 a 09:00 del día siguiente (24h lineales), en 4 bloques de 6h:
                  15:00, 21:00, 03:00 y 09:00.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  {bowlDevice?.device_id ?? "KPCL alimento"}
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                  {waterDevice?.device_id ?? "KPCL agua"}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-[calc(var(--radius)-8px)] border border-slate-200 bg-white p-3">
              <div className="h-[320px] w-full rounded-[calc(var(--radius)-10px)] bg-gradient-to-b from-rose-50/40 to-white px-2 py-2">
                {hasDayNightData ? (
                  <Line
                    data={dayNightChartData}
                    options={dayNightChartOptions}
                    plugins={[dayNightBackgroundPlugin]}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    {chartLoadError ?? "Sin datos en la ventana 09:00–09:00 para alimentación e hidratación."}
                  </div>
                )}
              </div>
            </div>
          </section>
        </header>

        <section className="surface-card freeform-rise px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Resumen rápido
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {summaryText}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Frescura: {freshnessLabel} · Última actualización:{" "}
                {lastRefreshAt ? formatTimestamp(lastRefreshAt) : "Sin datos"}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!selectedDeviceId) return;
                setIsRefreshing(true);
                try {
                  const result = await loadReadings(selectedDeviceId);
                  setState((prev) => ({
                    ...prev,
                    readings: result.data,
                    readingsCursor: result.nextCursor,
                  }));
                  setLastRefreshAt(new Date().toISOString());
                  setRefreshError(null);
                } catch (err) {
                  setRefreshError(
                    err instanceof Error
                      ? err.message
                      : "No se pudieron cargar las lecturas."
                  );
                } finally {
                  setIsRefreshing(false);
                }
              }}
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {isRefreshing ? "Actualizando..." : "Actualizar lecturas"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="relative rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 pr-20 text-sm text-slate-600 md:pr-24"
              >
                {stat.icon ? (
                  <div className="absolute inset-y-3 right-4 flex w-16 items-center justify-center md:w-20">
                    <img
                      src={stat.icon}
                      alt=""
                      aria-hidden="true"
                      className="max-h-full max-w-full object-contain opacity-95"
                    />
                  </div>
                ) : null}
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
            <Link
              href="/story"
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
            >
              Abrir diario
            </Link>
            <Link
              href="/pet"
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
            >
              Ver mascota
            </Link>
            <Link
              href="/bowl"
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
            >
              Estado del plato
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
              Frescura: {freshnessLabel}
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600">
              Últimas 24h
            </span>
          </div>
          {refreshError ? (
            <p className="mt-2 text-xs text-rose-600">{refreshError}</p>
          ) : null}
        </section>

        {state.error ? (
          <section className="surface-card freeform-rise px-6 py-6 text-sm text-slate-600">
            <p className="mb-3">{state.error}</p>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-[var(--radius)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Ir al login
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearTokens();
                  window.location.href = "/login";
                }}
                className="text-xs font-semibold text-slate-700"
              >
                Limpiar sesión
              </button>
            </div>
          </section>
        ) : null}

        {!state.isLoading &&
        !state.error &&
        (!primaryPet || !primaryDevice) ? (
          <section className="surface-card freeform-rise px-6 py-5 text-sm text-slate-600">
            <p className="mb-3">
              Aún no tienes todo el registro completo. Completa perfil,
              mascota y dispositivo para ver el feed. 
            </p> 
            <Link 
              href="/registro" 
              className="inline-flex h-9 items-center rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground" 
            > 
              Ir al registro 
            </Link> 
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="display-title text-lg font-semibold text-slate-900">
              Feed interpretado
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Últimas 24h
              </span>
              <Link
                href="/story"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Ver diario
              </Link>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Las lecturas duplicadas se ignoran (idempotencia por dispositivo y
            timestamp).
          </p>
          <div className="grid gap-4">
            {state.isLoading ? (
              <div className="surface-card freeform-rise px-6 py-5">
                <div className="space-y-3">
                  <div className="h-3 w-24 rounded-full bg-slate-200/70" />
                  <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
                  <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
                  <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
                </div>
              </div>
            ) : feedCards.length ? (
              feedCards.map((card) => (
                <article
                  key={card.title}
                  className="surface-card freeform-rise flex flex-col gap-3 px-6 py-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {card.icon ? (
                        <img
                          src={card.icon}
                          alt=""
                          aria-hidden="true"
                          className="h-9 w-9 rounded-[14px] border border-slate-200 bg-white object-contain p-1"
                        />
                      ) : null}
                      <h3 className="text-lg font-semibold text-slate-900">
                        {card.title}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneStyles[card.tone]}`}
                    >
                      {card.tone === "ok"
                        ? "Estable"
                        : card.tone === "warning"
                        ? "Atención"
                        : "Info"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{card.description}</p>
                </article>
              ))
            ) : (
              <div className="surface-card freeform-rise px-6 py-5 text-sm text-slate-500">
                Aún no hay lecturas para mostrar.
                <span className="mt-2 block text-xs text-slate-400">
                  Cuando el plato envíe datos, aquí verás un resumen claro.
                </span>
              </div>
            )}
          </div>
          {state.readingsCursor ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMoreReadings}
                disabled={state.isLoadingMore}
                className="h-9 rounded-[var(--radius)] border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700"
              >
                {state.isLoadingMore ? "Cargando..." : "Cargar más"}
              </button>
            </div>
          ) : null}
        </section>

      </div>
      {showGuide ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10">
          <div className="surface-card freeform-rise w-full max-w-lg px-6 py-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Modo guía
            </p>
            <h2 className="display-title mt-2 text-2xl font-semibold text-slate-900">
              Bienvenido a Hoy en casa
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Aquí verás cuánto come {petLabel}. También verás el estado del
              plato y comentarios personalizados para {ownerLabel}.
            </p>
            <div className="mt-5 grid gap-3 text-xs text-slate-600">
              <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2">
                Consejo: usa “Ver diario” para ver eventos del día.
              </div>
              <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2">
                Consejo: revisa “Perfil conductual” para ajustes de mascota.
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("kittypau_guide_seen", "1");
                  }
                  setShowGuide(false);
                }}
                className="h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
              >
                Entendido
              </button>
              <Link
                href="/registro"
                className="h-10 rounded-[var(--radius)] border border-slate-200 px-4 text-xs font-semibold text-slate-700" 
                onClick={() => { 
                  if (typeof window !== "undefined") { 
                    window.localStorage.setItem("kittypau_guide_seen", "1"); 
                  } 
                  setShowGuide(false); 
                }} 
              > 
                Completar registro 
              </Link> 
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}




