"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";
import { authFetch } from "@/lib/auth/auth-fetch";
import { useMqttLive } from "@/lib/hooks/useMqttLive";
import { syncSelectedDevice, syncSelectedPet } from "@/lib/runtime/selection-sync";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import { type ChartData, type ChartOptions, type Plugin } from "chart.js";
import { Line } from "react-chartjs-2";
import { buildSeries, ChartCard } from "@/lib/charts";

type ApiPet = {
  id: string;
  name: string;
  type?: string | null;
  origin?: string | null;
  size?: string | null;
  age_range?: string | null;
  weight_kg?: number | null;
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
  light_percent: number | null;
  battery_level: number | null;
};

type DayNightPoint = { x: number; y: number; t: number };

type IntakeSession = {
  startIndex: number;
  endIndex: number;
  startX: number;
  endX: number;
  startT: number;
  endT: number;
  startValue: number;
  endValue: number;
  consumed: number;
  durationMinutes: number;
};

type DeviceReadingsMap = Record<string, ApiReading[]>;

type StatCard = {
  label: string;
  value: string;
  icon?: string;
};

type PeriodStats = {
  consumed: number | null;
  cycles: number;
};

type ConsumptionSummary = {
  day: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
};
type ConsumptionViewPeriod = "one" | keyof ConsumptionSummary;

type SessionDetailStats = {
  events: number;
  avgConsumed: number | null;
  avgDurationMinutes: number | null;
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
  device: Pick<ApiDevice, "device_state" | "status"> | null | undefined,
): "on" | "off" | "nodata" {
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
}

function parsePetNumberSuffix(
  petName: string | null | undefined,
): number | null {
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
  if (value === null || value === undefined || !Number.isFinite(value))
    return null;
  return value;
}

function toRoundedSensorValue(value: number | null | undefined): number | null {
  const numeric = toNullableNumber(value);
  if (numeric === null) return null;
  return Math.round(numeric);
}

function getDayNightWindow(now = new Date()) {
  const start = new Date(now);
  start.setHours(6, 0, 0, 0);
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
  const hour = (((6 + rounded) % 24) + 24) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatSessionClock(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatSessionDuration(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatCycleDate(ts: number) {
  return new Date(ts).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  valueSelector: (reading: ApiReading) => number | null,
): DayNightPoint[] {
  return readings
    .map((reading) => {
      const ts = new Date(reading.recorded_at).getTime();
      const value = valueSelector(reading);
      if (Number.isNaN(ts) || ts < startMs || ts > endMs || value === null)
        return null;
      return {
        x: (ts - startMs) / (60 * 60 * 1000),
        y: value,
        t: ts,
      };
    })
    .filter((item): item is DayNightPoint => Boolean(item))
    .sort((a, b) => a.x - b.x);
}

function detectIntakeSessions(points: DayNightPoint[]): IntakeSession[] {
  if (points.length < 2) return [];
  const minDrop = 2;
  const maxGapMinutes = 180;
  const sessions: IntakeSession[] = [];
  let active: {
    startIndex: number;
    endIndex: number;
    consumed: number;
  } | null = null;

  const closeActive = () => {
    if (!active) return;
    const start = points[active.startIndex];
    const end = points[active.endIndex];
    const consumed = Math.max(0, Math.round(active.consumed));
    const durationMinutes = (end.t - start.t) / 60000;
    if (consumed >= minDrop && durationMinutes > 0) {
      sessions.push({
        startIndex: active.startIndex,
        endIndex: active.endIndex,
        startX: start.x,
        endX: end.x,
        startT: start.t,
        endT: end.t,
        startValue: start.y,
        endValue: end.y,
        consumed,
        durationMinutes,
      });
    }
    active = null;
  };

  for (let idx = 1; idx < points.length; idx += 1) {
    const prev = points[idx - 1];
    const curr = points[idx];
    const gapMinutes = (curr.t - prev.t) / 60000;
    if (gapMinutes > maxGapMinutes) {
      closeActive();
      continue;
    }
    const delta = curr.y - prev.y;
    if (delta <= -minDrop) {
      if (!active) {
        active = {
          startIndex: idx - 1,
          endIndex: idx,
          consumed: -delta,
        };
      } else {
        active.endIndex = idx;
        active.consumed += -delta;
      }
      continue;
    }
    closeActive();
  }

  closeActive();
  return sessions;
}

function findSessionForPoint(
  sessions: IntakeSession[],
  pointIndex: number,
): IntakeSession | null {
  return (
    sessions.find(
      (session) =>
        pointIndex >= session.startIndex && pointIndex <= session.endIndex,
    ) ?? null
  );
}

function summarizeSessionsByPeriods(
  sessions: IntakeSession[],
  nowMs: number,
): ConsumptionSummary {
  const boundaries = {
    day: nowMs - 24 * 60 * 60 * 1000,
    week: nowMs - 7 * 24 * 60 * 60 * 1000,
    month: nowMs - 30 * 24 * 60 * 60 * 1000,
  };

  const build = (startMs: number): PeriodStats => {
    const filtered = sessions.filter((session) => session.endT >= startMs);
    if (!filtered.length) return { consumed: null, cycles: 0 };
    const consumed = filtered.reduce(
      (acc, session) => acc + Math.max(0, session.consumed),
      0,
    );
    return { consumed: Math.round(consumed), cycles: filtered.length };
  };

  return {
    day: build(boundaries.day),
    week: build(boundaries.week),
    month: build(boundaries.month),
  };
}

function summarizeSessionDetailsByPeriod(
  sessions: IntakeSession[],
  nowMs: number,
  period: keyof ConsumptionSummary,
): SessionDetailStats {
  const startMsByPeriod = {
    day: nowMs - 24 * 60 * 60 * 1000,
    week: nowMs - 7 * 24 * 60 * 60 * 1000,
    month: nowMs - 30 * 24 * 60 * 60 * 1000,
  };
  const filtered = sessions.filter(
    (session) => session.endT >= startMsByPeriod[period],
  );
  if (!filtered.length) {
    return {
      events: 0,
      avgConsumed: null,
      avgDurationMinutes: null,
    };
  }
  const totalConsumed = filtered.reduce(
    (acc, session) => acc + Math.max(0, session.consumed),
    0,
  );
  const totalDuration = filtered.reduce(
    (acc, session) => acc + Math.max(0, session.durationMinutes),
    0,
  );
  return {
    events: filtered.length,
    avgConsumed: Math.round(totalConsumed / filtered.length),
    avgDurationMinutes: Math.round(totalDuration / filtered.length),
  };
}

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function TodayPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [deviceLatestReadings, setDeviceLatestReadings] = useState<
    Record<string, ApiReading | null>
  >({});
  const [devicePreviousReadings, setDevicePreviousReadings] = useState<
    Record<string, ApiReading | null>
  >({});
  const [deviceChartReadings, setDeviceChartReadings] =
    useState<DeviceReadingsMap>({});
  const [deviceHistoryReadings, setDeviceHistoryReadings] =
    useState<DeviceReadingsMap>({});
  const [bowlLongReadings, setBowlLongReadings] = useState<ApiReading[]>([]);
  const [chartLoadError, setChartLoadError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [accountType, setAccountType] = useState<
    "admin" | "tester" | "client" | null
  >(null);
  const [consumptionPeriod, setConsumptionPeriod] =
    useState<ConsumptionViewPeriod>("day");
  const [dayCycleOffsetDays, setDayCycleOffsetDays] = useState(0);

  // device_id en formato KPCL (texto) para suscripción MQTT
  const mqttDeviceId = useMemo(
    () =>
      state.devices.find((d) => d.id === selectedDeviceId)?.device_id ?? null,
    [state.devices, selectedDeviceId],
  );

  // Live readings directo desde HiveMQ WebSocket
  const { reading: liveReading } = useMqttLive(mqttDeviceId);

  useEffect(() => {
    if (!liveReading || !selectedDeviceId) return;
    const asReading: ApiReading = {
      id:           `live-${liveReading.receivedAt}`,
      device_id:    selectedDeviceId,
      recorded_at:  liveReading.receivedAt,
      weight_grams: liveReading.weight,
      water_ml:     null,
      flow_rate:    null,
      temperature:  liveReading.temperature,
      humidity:     liveReading.humidity,
      light_percent: liveReading.lightPercent,
      battery_level: liveReading.batteryLevel,
    };
    setState((prev) => {
      const exists = prev.readings.some((r) => r.id === asReading.id);
      if (exists) return prev;
      return { ...prev, readings: [asReading, ...prev.readings].slice(0, 120) };
    });
    setLastRefreshAt(liveReading.receivedAt);
    setRefreshError(null);
  }, [liveReading, selectedDeviceId]);

  useEffect(() => {
    let mounted = true;
    getValidAccessToken().then(async (value) => {
      if (!mounted) return;
      setIsAuthed(Boolean(value));
      if (!value) {
        setAccountType(null);
        return;
      }
      try {
        const res = await fetch("/api/account/type", {
          headers: { Authorization: `Bearer ${value}` },
        });
        if (!mounted) return;
        if (!res.ok) {
          setAccountType(null);
          return;
        }
        const payload = await res.json().catch(() => null);
        const nextType =
          payload?.account_type === "admin" ||
          payload?.account_type === "tester"
            ? payload.account_type
            : "client";
        setAccountType(nextType);
        if (nextType === "client") {
          router.replace("/inicio");
        } else if (nextType === "admin") {
          router.replace("/admin");
        }
      } catch {
        if (mounted) setAccountType(null);
      }
    });
    return () => {
      mounted = false;
    };
  }, [router]);

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
    limit = 50,
    range?: { from?: string; to?: string },
  ) => {
    const params = new URLSearchParams({
      device_id: deviceId,
      limit: String(limit),
    });
    if (cursor) params.set("cursor", cursor);
    if (range?.from) params.set("from", range.from);
    if (range?.to) params.set("to", range.to);
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
          pets.find((pet) => pet.id === storedPetId) ?? pets[0];
        const storedDeviceId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("kittypau_device_id")
            : null;
        const petSuffix = parsePetNumberSuffix(primaryPet?.name);
        const expectedFoodDeviceId = petSuffix
          ? kpclLabelFromNumber(petSuffix)
          : null;
        const devicesByPet = devices.filter(
          (device) => device.pet_id === primaryPet?.id,
        );
        const primaryDevice =
          devicesByPet.find((device) => device.id === storedDeviceId) ??
          devicesByPet.find(
            (device) =>
              (device.device_id ?? "").toUpperCase() === expectedFoodDeviceId,
          ) ??
          devicesByPet[0] ??
          devices.find((device) => device.id === storedDeviceId) ??
          devices.find(
            (device) =>
              (device.device_id ?? "").toUpperCase() === expectedFoodDeviceId,
          ) ??
          devices[0];

        let readings: ApiReading[] = [];
        let readingsCursor: string | null = null;
        const initialDeviceId = primaryDevice?.id ?? null;
        setSelectedPetId(primaryPet?.id ?? null);
        setSelectedDeviceId(initialDeviceId);
        if (primaryPet?.id) {
          syncSelectedPet(primaryPet.id, primaryPet.name ?? "");
        }
        if (initialDeviceId) {
          syncSelectedDevice(initialDeviceId);
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

  // Live readings manejados por useMqttLive + useEffect arriba

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
    window.addEventListener(
      "kittypau-device-change",
      onDeviceChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "kittypau-device-change",
        onDeviceChange as EventListener,
      );
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
    state.pets.find((pet) => pet.id === selectedPetId) ?? state.pets[0];
  const selectedPetSuffix = parsePetNumberSuffix(primaryPet?.name);
  const expectedFoodDeviceCode = selectedPetSuffix
    ? kpclLabelFromNumber(selectedPetSuffix)
    : null;
  const expectedWaterDeviceCode = selectedPetSuffix
    ? kpclLabelFromNumber(selectedPetSuffix + 1)
    : null;
  const petDevices = useMemo(() => {
    const base = state.devices.filter(
      (device) => device.pet_id === primaryPet?.id,
    );
    const byFoodCode = expectedFoodDeviceCode
      ? state.devices.find(
          (device) =>
            (device.device_id ?? "").toUpperCase() === expectedFoodDeviceCode &&
            (device.pet_id === primaryPet?.id || !device.pet_id),
        )
      : null;
    const byWaterCode = expectedWaterDeviceCode
      ? state.devices.find(
          (device) =>
            (device.device_id ?? "").toUpperCase() ===
              expectedWaterDeviceCode &&
            (device.pet_id === primaryPet?.id || !device.pet_id),
        )
      : null;
    const merged = [...base];
    if (byFoodCode && !merged.some((item) => item.id === byFoodCode.id))
      merged.push(byFoodCode);
    if (byWaterCode && !merged.some((item) => item.id === byWaterCode.id))
      merged.push(byWaterCode);
    return merged;
  }, [
    state.devices,
    primaryPet?.id,
    expectedFoodDeviceCode,
    expectedWaterDeviceCode,
  ]);
  const ownerLabel =
    state.profile?.owner_name || state.profile?.user_name || "tu";
  const petLabel = primaryPet?.name ?? "tu mascota";
  const petTypeLabel =
    primaryPet?.type === "dog"
      ? "Perro"
      : primaryPet?.type === "cat"
        ? "Gato"
        : null;
  const petMeta = [
    petTypeLabel,
    primaryPet?.origin ?? null,
    primaryPet?.size ?? null,
    primaryPet?.age_range ?? null,
    typeof primaryPet?.weight_kg === "number"
      ? `${primaryPet.weight_kg} kg`
      : null,
  ].filter(Boolean) as string[];
  const primaryDevice =
    petDevices.find((device) => device.id === selectedDeviceId) ??
    petDevices.find(
      (device) =>
        (device.device_id ?? "").toUpperCase() === expectedFoodDeviceCode,
    ) ??
    petDevices[0] ??
    state.devices.find((device) => device.id === selectedDeviceId) ??
    state.devices[0];
  const bowlDevice =
    petDevices.find(
      (device) =>
        (device.device_id ?? "").toUpperCase() === expectedFoodDeviceCode,
    ) ??
    petDevices.find(
      (device) =>
        device.device_id?.toUpperCase().includes("KPCL") ||
        (device.device_type ?? "").toLowerCase().includes("comedero"),
    ) ??
    primaryDevice;
  const waterDevice =
    petDevices.find(
      (device) =>
        (device.device_id ?? "").toUpperCase() === expectedWaterDeviceCode,
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
    }) ??
    null;
  const latestReading = state.readings[0] ?? null;
  const bowlLatestReading = bowlDevice?.id
    ? (deviceLatestReadings[bowlDevice.id] ?? null)
    : null;
  const bowlPreviousReading = bowlDevice?.id
    ? (devicePreviousReadings[bowlDevice.id] ?? null)
    : null;
  const waterLatestReading = waterDevice?.id
    ? (deviceLatestReadings[waterDevice.id] ?? null)
    : null;
  const waterPreviousReading = waterDevice?.id
    ? (devicePreviousReadings[waterDevice.id] ?? null)
    : null;
  const freshnessLabel = useMemo(
    () => getFreshnessLabelByTimestamp(latestReading?.recorded_at),
    [latestReading?.recorded_at],
  );
  const heroUpdatedAt = useMemo(() => {
    const candidates = [
      bowlLatestReading?.recorded_at ?? null,
      waterLatestReading?.recorded_at ?? null,
    ].filter((value): value is string => Boolean(value));
    if (!candidates.length) return null;
    return (
      candidates
        .map((value) => ({ value, ts: new Date(value).getTime() }))
        .filter((item) => Number.isFinite(item.ts))
        .sort((a, b) => b.ts - a.ts)[0]?.value ?? null
    );
  }, [bowlLatestReading?.recorded_at, waterLatestReading?.recorded_at]);
  const heroUpdatedLabel = heroUpdatedAt
    ? formatTimestamp(heroUpdatedAt)
    : "Sin datos";

  useEffect(() => {
    // Keep the live panel aligned with the hero food device for the selected pet.
    if (!bowlDevice?.id || selectedDeviceId === bowlDevice.id) return;
    let active = true;
    const syncLivePanelDevice = async () => {
      setSelectedDeviceId(bowlDevice.id);
      syncSelectedDevice(bowlDevice.id);
      try {
        const result = await loadReadings(bowlDevice.id);
        if (!active) return;
        setState((prev) => ({
          ...prev,
          readings: result.data,
          readingsCursor: result.nextCursor,
        }));
        setLastRefreshAt(new Date().toISOString());
      } catch {
        // Keep current state if sync fetch fails; hero still reads from dedicated device map.
      }
    };
    void syncLivePanelDevice();
    return () => {
      active = false;
    };
  }, [bowlDevice?.id, selectedDeviceId]);

  useEffect(() => {
    const targetIds = [bowlDevice?.id, waterDevice?.id].filter(
      (value, index, arr): value is string =>
        Boolean(value) && arr.indexOf(value) === index,
    );
    if (!targetIds.length) return;
    let active = true;
    const loadTargets = async () => {
      const entries = await Promise.all(
        targetIds.map(async (deviceId) => {
          try {
            const result = await loadReadings(deviceId, null, 2);
            return [
              deviceId,
              result.data[0] ?? null,
              result.data[1] ?? null,
            ] as const;
          } catch {
            return [deviceId, null, null] as const;
          }
        }),
      );
      if (!active) return;
      setDeviceLatestReadings((prev) => ({
        ...prev,
        ...Object.fromEntries(
          entries.map(([deviceId, latest]) => [deviceId, latest]),
        ),
      }));
      setDevicePreviousReadings((prev) => ({
        ...prev,
        ...Object.fromEntries(
          entries.map(([deviceId, _latest, previous]) => [deviceId, previous]),
        ),
      }));
    };
    void loadTargets();
    return () => {
      active = false;
    };
  }, [bowlDevice?.id, waterDevice?.id]);

  useEffect(() => {
    if (!bowlDevice?.id) return;
    let active = true;
    const load3Days = async () => {
      const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      try {
        const result = await loadReadings(bowlDevice.id, null, 5000, { from });
        if (!active) return;
        setBowlLongReadings(result.data);
      } catch {
        // keep empty — chart shows "sin lecturas"
      }
    };
    void load3Days();
    return () => { active = false; };
  }, [bowlDevice?.id]);

  useEffect(() => {
    const targetIds = [bowlDevice?.id, waterDevice?.id].filter(
      (value, index, arr): value is string =>
        Boolean(value) && arr.indexOf(value) === index,
    );
    if (!targetIds.length) return;
    let active = true;
    const loadChartTargets = async () => {
      const anchor = new Date();
      if (dayCycleOffsetDays > 0) {
        anchor.setDate(anchor.getDate() - dayCycleOffsetDays);
      }
      const cycleWindow = getDayNightWindow(anchor);
      const cycleFrom = new Date(cycleWindow.startMs).toISOString();
      const cycleTo = new Date(cycleWindow.endMs).toISOString();
      const entries = await Promise.all(
        targetIds.map(async (deviceId) => {
          try {
            const result = await loadReadings(deviceId, null, 500, {
              from: cycleFrom,
              to: cycleTo,
            });
            return [deviceId, result.data] as const;
          } catch {
            return [deviceId, []] as const;
          }
        }),
      );
      if (!active) return;
      setDeviceChartReadings((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
      const hasAnyData = entries.some(([, values]) => values.length > 0);
      setChartLoadError(
        hasAnyData
          ? null
          : "Sin lecturas suficientes para construir el gráfico.",
      );
    };
    void loadChartTargets();
    return () => {
      active = false;
    };
  }, [bowlDevice?.id, dayCycleOffsetDays, waterDevice?.id]);

  useEffect(() => {
    const targetIds = [bowlDevice?.id, waterDevice?.id].filter(
      (value, index, arr): value is string =>
        Boolean(value) && arr.indexOf(value) === index,
    );
    if (!targetIds.length) return;
    let active = true;
    const loadHistoryTargets = async () => {
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const from = monthAgo.toISOString();
      const to = now.toISOString();
      const entries = await Promise.all(
        targetIds.map(async (deviceId) => {
          try {
            const result = await loadReadings(deviceId, null, 1200, {
              from,
              to,
            });
            return [deviceId, result.data] as const;
          } catch {
            return [deviceId, []] as const;
          }
        }),
      );
      if (!active) return;
      setDeviceHistoryReadings((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    };
    void loadHistoryTargets();
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
    if (
      latestReading.weight_grams !== null &&
      latestReading.weight_grams >= 3500
    ) {
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
      const temperatureText =
        latestReading.temperature !== null
          ? String(toRoundedSensorValue(latestReading.temperature))
          : "-";
      const humidityText =
        latestReading.humidity !== null
          ? String(toRoundedSensorValue(latestReading.humidity))
          : "-";
      items.push({
        title: "Ambiente",
        description: `Temp ${temperatureText}° · Humedad ${humidityText}%.`,
        tone: "warning",
      });
    }
    return items.slice(0, 3);
  }, [latestReading]);

  const quickStats = useMemo(() => {
    if (!latestReading) {
      return [
        {
          label: "Hidratación",
          value: "Sin datos",
          icon: "/illustrations/green_water_full.png",
        },
        {
          label: "Alimento",
          value: "Sin datos",
          icon: "/illustrations/pink_food_full.png",
        },
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
        ? `${toRoundedSensorValue(latestReading.temperature)}° · ${toRoundedSensorValue(
            latestReading.humidity,
          )}%`
        : "Sin ambiente";
    return [
      {
        label: "Hidratación",
        value: hydration,
        icon: "/illustrations/green_water_full.png",
      },
      {
        label: "Alimento",
        value: food,
        icon: "/illustrations/pink_food_full.png",
      },
      { label: "Ambiente", value: ambient },
    ] as StatCard[];
  }, [latestReading]);

  const toneStyles: Record<string, string> = {
    ok: "border-emerald-200/60 bg-emerald-50/60 text-emerald-800",
    warning: "border-amber-200/60 bg-amber-50/70 text-amber-800",
    info: "border-sky-200/60 bg-sky-50/70 text-sky-800",
  };
  const bowlTempText =
    bowlLatestReading?.temperature !== null &&
    bowlLatestReading?.temperature !== undefined
      ? `${toRoundedSensorValue(bowlLatestReading.temperature)}°C`
      : "N/D";
  const bowlHumidityText =
    bowlLatestReading?.humidity !== null &&
    bowlLatestReading?.humidity !== undefined
      ? `${toRoundedSensorValue(bowlLatestReading.humidity)}%`
      : "N/D";
  const bowlLightText =
    bowlLatestReading?.light_percent !== null &&
    bowlLatestReading?.light_percent !== undefined
      ? `${toRoundedSensorValue(bowlLatestReading.light_percent)}%`
      : "N/D";
  const bowlPlateWeightGrams = toNullableNumber(bowlDevice?.plate_weight_grams);
  const bowlGrossWeightGrams = toNullableNumber(
    bowlLatestReading?.weight_grams,
  );
  const bowlContentWeightGrams =
    bowlGrossWeightGrams !== null
      ? Math.max(0, bowlPlateWeightGrams !== null ? bowlGrossWeightGrams - bowlPlateWeightGrams : bowlGrossWeightGrams)
      : null;
  const bowlContentWeightText =
    bowlContentWeightGrams !== null
      ? `${Math.round(bowlContentWeightGrams)} g`
      : "N/D";
  const bowlPlateWeightText =
    bowlPlateWeightGrams !== null
      ? `${Math.round(Math.max(0, bowlPlateWeightGrams))} g`
      : "N/D";
  const bowlSensorWeightText =
    bowlGrossWeightGrams !== null
      ? `${Math.round(Math.max(0, bowlGrossWeightGrams))} g`
      : "N/D";
  const waterTempText =
    waterLatestReading?.temperature !== null &&
    waterLatestReading?.temperature !== undefined
      ? `${toRoundedSensorValue(waterLatestReading.temperature)}°C`
      : "N/D";
  const waterHumidityText =
    waterLatestReading?.humidity !== null &&
    waterLatestReading?.humidity !== undefined
      ? `${toRoundedSensorValue(waterLatestReading.humidity)}%`
      : "N/D";
  const waterLightText =
    waterLatestReading?.light_percent !== null &&
    waterLatestReading?.light_percent !== undefined
      ? `${toRoundedSensorValue(waterLatestReading.light_percent)}%`
      : "N/D";
  const waterPlateWeightGrams = toNullableNumber(
    waterDevice?.plate_weight_grams,
  );
  const waterGrossWeightGrams = toNullableNumber(
    waterLatestReading?.weight_grams,
  );
  const waterContentWeightGrams =
    waterGrossWeightGrams !== null
      ? Math.max(0, waterPlateWeightGrams !== null ? waterGrossWeightGrams - waterPlateWeightGrams : waterGrossWeightGrams)
      : null;
  const waterContentWeightText =
    waterContentWeightGrams !== null
      ? `${Math.round(waterContentWeightGrams)} g`
      : "N/D";
  const waterPlateWeightText =
    waterPlateWeightGrams !== null
      ? `${Math.round(Math.max(0, waterPlateWeightGrams))} g`
      : "N/D";
  const waterSensorWeightText =
    waterGrossWeightGrams !== null
      ? `${Math.round(Math.max(0, waterGrossWeightGrams))} g`
      : "N/D";
  const waterVolumeCm3Text =
    waterContentWeightGrams !== null
      ? `${Math.round(waterContentWeightGrams)} cm3`
      : "N/D";

  const bowlPrevGrossWeightGrams = toNullableNumber(
    bowlPreviousReading?.weight_grams,
  );
  const bowlPrevContentWeightGrams =
    bowlPrevGrossWeightGrams !== null
      ? Math.max(0, bowlPlateWeightGrams !== null ? bowlPrevGrossWeightGrams - bowlPlateWeightGrams : bowlPrevGrossWeightGrams)
      : null;
  const bowlPrevTemp = toNullableNumber(bowlPreviousReading?.temperature);
  const bowlPrevHumidity = toNullableNumber(bowlPreviousReading?.humidity);
  const bowlPrevLight = toNullableNumber(bowlPreviousReading?.light_percent);

  const waterPrevGrossWeightGrams = toNullableNumber(
    waterPreviousReading?.weight_grams,
  );
  const waterPrevContentWeightGrams =
    waterPrevGrossWeightGrams !== null
      ? Math.max(0, waterPlateWeightGrams !== null ? waterPrevGrossWeightGrams - waterPlateWeightGrams : waterPrevGrossWeightGrams)
      : null;
  const waterPrevTemp = toNullableNumber(waterPreviousReading?.temperature);
  const waterPrevHumidity = toNullableNumber(waterPreviousReading?.humidity);
  const waterPrevLight = toNullableNumber(waterPreviousReading?.light_percent);

  const renderTrend = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return null;
    const delta = current - previous;
    if (Math.abs(delta) < 0.001) return null;
    const up = delta > 0;
    return (
      <span
        aria-hidden="true"
        className="ml-1 inline-flex text-[9px] leading-none opacity-80 text-sky-600"
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

  const dayNightWindow = useMemo(() => {
    const anchor = new Date();
    if (dayCycleOffsetDays > 0) {
      anchor.setDate(anchor.getDate() - dayCycleOffsetDays);
    }
    return getDayNightWindow(anchor);
  }, [dayCycleOffsetDays, lastRefreshAt]);
  const dayNightRangeTitle = useMemo(() => {
    const cycleDate = formatCycleDate(dayNightWindow.startMs);
    return dayCycleOffsetDays === 0 ? "hoy" : cycleDate;
  }, [dayCycleOffsetDays, dayNightWindow.startMs]);
  const selectedPetIndex = Math.max(
    0,
    state.pets.findIndex((pet) => pet.id === (primaryPet?.id ?? "")),
  );
  const switchPetByOffset = async (offset: -1 | 1) => {
    if (!state.pets.length) return;
    const nextIndex =
      (selectedPetIndex + offset + state.pets.length) % state.pets.length;
    const pet = state.pets[nextIndex];
    const suffix = parsePetNumberSuffix(pet.name);
    const foodCode = suffix ? kpclLabelFromNumber(suffix) : null;
    const nextPetDevices = state.devices.filter(
      (device) => device.pet_id === pet.id,
    );
    const nextDevice =
      nextPetDevices.find(
        (device) => (device.device_id ?? "").toUpperCase() === foodCode,
      ) ??
      nextPetDevices[0] ??
      state.devices.find(
        (device) =>
          (device.device_id ?? "").toUpperCase() === foodCode &&
          (!device.pet_id || device.pet_id === pet.id),
      ) ??
      null;

    setSelectedPetId(pet.id);
    syncSelectedPet(pet.id, pet.name ?? "");

    if (!nextDevice) return;
    setSelectedDeviceId(nextDevice.id);
    syncSelectedDevice(nextDevice.id);
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
          : "No se pudieron cargar las lecturas.",
      );
    }
  };
  const bowlChartReadings = bowlDevice?.id
    ? (deviceChartReadings[bowlDevice.id] ?? [])
    : [];
  const waterChartReadings = waterDevice?.id
    ? (deviceChartReadings[waterDevice.id] ?? [])
    : [];

  const todayWeightSeries = useMemo(
    () =>
      buildSeries(
        bowlLongReadings,
        (r) => {
          const gross = r.weight_grams;
          const plate = bowlDevice?.plate_weight_grams;
          if (gross === null || gross === undefined) return null;
          if (plate === null || plate === undefined) return gross;
          return Math.max(0, gross - plate);
        },
        THREE_DAYS_MS,
      ),
    [bowlLongReadings, bowlDevice?.plate_weight_grams],
  );
  const todayTempSeries = useMemo(
    () => buildSeries(bowlLongReadings, (r) => r.temperature, THREE_DAYS_MS),
    [bowlLongReadings],
  );
  const todayHumiditySeries = useMemo(
    () => buildSeries(bowlLongReadings, (r) => r.humidity, THREE_DAYS_MS),
    [bowlLongReadings],
  );
  const todayLightSeries = useMemo(
    () => buildSeries(bowlLongReadings, (r) => r.light_percent, THREE_DAYS_MS),
    [bowlLongReadings],
  );
  const todayLatestWeight = todayWeightSeries[0]?.value ?? null;
  const todayLatestTemp = todayTempSeries[0]?.value ?? null;
  const todayLatestHumidity = todayHumiditySeries[0]?.value ?? null;
  const todayLatestLight = todayLightSeries[0]?.value ?? null;

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
        selectBowlSeriesValue,
      ),
    [
      bowlChartReadings,
      dayNightWindow.endMs,
      dayNightWindow.startMs,
      bowlDevice?.plate_weight_grams,
    ],
  );

  const waterDayNightPoints = useMemo(
    () =>
      toDayNightPoints(
        waterChartReadings,
        dayNightWindow.startMs,
        dayNightWindow.endMs,
        selectWaterSeriesValue,
      ),
    [
      waterChartReadings,
      dayNightWindow.endMs,
      dayNightWindow.startMs,
      waterDevice?.plate_weight_grams,
    ],
  );

  const bowlIntakeSessions = useMemo(
    () => detectIntakeSessions(bowlDayNightPoints),
    [bowlDayNightPoints],
  );

  const waterIntakeSessions = useMemo(
    () => detectIntakeSessions(waterDayNightPoints),
    [waterDayNightPoints],
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
    img.src = "/fondo.png";
    return img;
  }, []);

  const dayNightBackgroundPlugin = useMemo<Plugin<"line">>(
    () => ({
      id: "kittypau-day-night-background",
      beforeDatasetsDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea || !dayNightBackground || !dayNightBackground.complete)
          return;
        const areaWidth = chartArea.right - chartArea.left;
        const areaHeight = chartArea.bottom - chartArea.top;
        if (areaWidth <= 0 || areaHeight <= 0) return;
        const imageWidth =
          dayNightBackground.naturalWidth || dayNightBackground.width;
        const imageHeight =
          dayNightBackground.naturalHeight || dayNightBackground.height;
        if (!imageWidth || !imageHeight) return;

        // Draw in "cover" mode to keep proportions and avoid stretched background.
        const imageAspect = imageWidth / imageHeight;
        const areaAspect = areaWidth / areaHeight;
        let srcX = 0;
        let srcY = 0;
        let srcW = imageWidth;
        let srcH = imageHeight;

        if (imageAspect > areaAspect) {
          srcW = imageHeight * areaAspect;
          srcX = (imageWidth - srcW) / 2;
        } else {
          srcH = imageWidth / areaAspect;
          srcY = (imageHeight - srcH) / 2;
        }

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.globalAlpha = 1;
        ctx.drawImage(
          dayNightBackground,
          srcX,
          srcY,
          srcW,
          srcH,
          chartArea.left,
          chartArea.top,
          areaWidth,
          areaHeight,
        );
        ctx.restore();
      },
    }),
    [dayNightBackground],
  );

  const dayNightChartData = useMemo<ChartData<"line", DayNightPoint[]>>(
    () => ({
      datasets: [
        {
          label: `Alimentación (${bowlDevice?.device_id ?? "KPCL"})`,
          data: bowlDayNightPoints,
          showLine: false,
          pointStyle: foodPointStyle,
          pointRadius: 9,
          pointHoverRadius: 10,
          pointHoverBorderWidth: 2,
          pointBackgroundColor: "#ec4899",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
        },
        {
          label: `Hidratación (${waterDevice?.device_id ?? "KPCL"})`,
          data: waterDayNightPoints,
          showLine: false,
          pointStyle: waterPointStyle,
          pointRadius: 9,
          pointHoverRadius: 10,
          pointHoverBorderWidth: 2,
          pointBackgroundColor: "#14b8a6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
        },
      ],
    }),
    [
      bowlDayNightPoints,
      bowlDevice?.device_id,
      foodPointStyle,
      waterDayNightPoints,
      waterDevice?.device_id,
      waterPointStyle,
    ],
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
          position: "bottom",
          align: "center",
          labels: {
            color: "#334155",
            usePointStyle: true,
            padding: 16,
            boxWidth: 14,
            boxHeight: 14,
            font: {
              size: 12,
              family:
                "Nunito, Quicksand, system-ui, -apple-system, Segoe UI, sans-serif",
              weight: 600,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleColor: "#f8fafc",
          bodyColor: "#f8fafc",
          footerColor: "#cbd5e1",
          titleFont: {
            family:
              "Nunito, Quicksand, system-ui, -apple-system, Segoe UI, sans-serif",
            size: 12,
            weight: 700,
          },
          bodyFont: {
            family:
              "Nunito, Quicksand, system-ui, -apple-system, Segoe UI, sans-serif",
            size: 11,
            weight: 600,
          },
          footerFont: {
            family:
              "Nunito, Quicksand, system-ui, -apple-system, Segoe UI, sans-serif",
            size: 10,
            weight: 500,
          },
          borderColor: "rgba(148, 163, 184, 0.35)",
          borderWidth: 1,
          cornerRadius: 10,
          padding: 10,
          displayColors: false,
          usePointStyle: false,
          boxPadding: 2,
          callbacks: {
            title: (items) => {
              void items;
              return "";
            },
            label: (context) => {
              const point = context.parsed;
              const value =
                typeof context.parsed.y === "number"
                  ? Math.round(context.parsed.y)
                  : null;
              const label = String(context.dataset.label ?? "Serie");
              const seriesTitle = label.includes("Hidratación")
                ? "Hidratación"
                : label.includes("Alimentación")
                  ? "Alimentación"
                  : "Lectura";
              const pointTime =
                typeof point.x === "number"
                  ? new Date(
                      dayNightWindow.startMs + point.x * 60 * 60 * 1000,
                    ).toLocaleString("es-CL", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "N/D";
              const isHydration = label.includes("Hidratación");
              const unit = isHydration ? "cm3 (aprox)" : "g";
              const valueText = value === null ? "N/D" : `${value} ${unit}`;
              return [`${seriesTitle} · ${pointTime}`, `Valor: ${valueText}`];
            },
            afterLabel: (context) => {
              const label = context.dataset.label ?? "Serie";
              const isHydration = label.includes("Hidratación");
              const unit = isHydration ? "cm3 (aprox)" : "g";
              const sessions =
                context.datasetIndex === 0
                  ? bowlIntakeSessions
                  : waterIntakeSessions;
              const session = findSessionForPoint(sessions, context.dataIndex);
              if (!session) return ["Proceso: sin evento detectado"];
              return [
                `Inicio: ${formatSessionClock(session.startT)}`,
                `Fin: ${formatSessionClock(session.endT)}`,
                `Duración: ${formatSessionDuration(session.durationMinutes)}`,
                `Consumo proceso: ${Math.round(session.consumed)} ${unit}`,
              ];
            },
            footer: () => "KittyPaw · Ciclo diario",
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 24,
          grid: {
            color: "rgba(244,114,182,0.2)",
            drawBorder: false,
          },
          border: {
            color: "rgba(148,163,184,0.55)",
          },
          ticks: {
            stepSize: 1,
            color: "#334155",
            maxRotation: 0,
            minRotation: 0,
            callback: (value) => {
              const numeric = Number(value);
              if (!isBoundaryHour(numeric)) return "";
              return formatHourFromOffset(numeric);
            },
            font: {
              size: 12,
              family:
                "Nunito, Quicksand, system-ui, -apple-system, Segoe UI, sans-serif",
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
    [bowlIntakeSessions, dayNightWindow.startMs, waterIntakeSessions],
  );

  const nowMs = useMemo(
    () => Date.now(),
    [deviceHistoryReadings, bowlDevice?.id, waterDevice?.id],
  );
  const monthStartMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  const bowlHistoryPoints = useMemo(
    () =>
      toDayNightPoints(
        bowlDevice?.id ? (deviceHistoryReadings[bowlDevice.id] ?? []) : [],
        monthStartMs,
        nowMs,
        (reading) => {
          const gross = toNullableNumber(reading.weight_grams);
          if (gross === null) return null;
          const tare = Math.max(0, bowlDevice?.plate_weight_grams ?? 0);
          return Math.max(0, gross - tare);
        },
      ),
    [
      bowlDevice?.id,
      bowlDevice?.plate_weight_grams,
      deviceHistoryReadings,
      monthStartMs,
      nowMs,
    ],
  );
  const waterHistoryPoints = useMemo(
    () =>
      toDayNightPoints(
        waterDevice?.id ? (deviceHistoryReadings[waterDevice.id] ?? []) : [],
        monthStartMs,
        nowMs,
        (reading) => {
          const gross = toNullableNumber(reading.weight_grams);
          if (gross === null) return null;
          const tare = Math.max(0, waterDevice?.plate_weight_grams ?? 0);
          return Math.max(0, gross - tare);
        },
      ),
    [
      waterDevice?.id,
      waterDevice?.plate_weight_grams,
      deviceHistoryReadings,
      monthStartMs,
      nowMs,
    ],
  );
  const bowlHistorySessions = useMemo(
    () => detectIntakeSessions(bowlHistoryPoints),
    [bowlHistoryPoints],
  );
  const waterHistorySessions = useMemo(
    () => detectIntakeSessions(waterHistoryPoints),
    [waterHistoryPoints],
  );
  const bowlConsumptionSummary = useMemo(
    () => summarizeSessionsByPeriods(bowlHistorySessions, nowMs),
    [bowlHistorySessions, nowMs],
  );
  const waterConsumptionSummary = useMemo(
    () => summarizeSessionsByPeriods(waterHistorySessions, nowMs),
    [waterHistorySessions, nowMs],
  );
  const summaryPeriod: keyof ConsumptionSummary =
    consumptionPeriod === "one" ? "day" : consumptionPeriod;
  const detailPeriod: keyof ConsumptionSummary =
    consumptionPeriod === "one" ? "month" : consumptionPeriod;
  const bowlDetailSummary = useMemo(
    () =>
      summarizeSessionDetailsByPeriod(bowlHistorySessions, nowMs, detailPeriod),
    [bowlHistorySessions, nowMs, detailPeriod],
  );
  const waterDetailSummary = useMemo(
    () =>
      summarizeSessionDetailsByPeriod(
        waterHistorySessions,
        nowMs,
        detailPeriod,
      ),
    [waterHistorySessions, nowMs, detailPeriod],
  );
  const formatConsumedValue = (value: number | null, unit: "g" | "ml") =>
    value === null ? "N/D" : `${value} ${unit}`;
  const periodLabels: Array<{
    key: ConsumptionViewPeriod;
    label: string;
    description: string;
  }> = [
    {
      key: "one",
      label: "Unidad",
      description: "Promedio por evento individual durante los últimos 30 días.",
    },
    {
      key: "day",
      label: "Día",
      description: "Resumen acumulado de consumo y frecuencia en 24 horas.",
    },
    {
      key: "week",
      label: "Semana",
      description: "Vista semanal para detectar cambios de patrón de rutina.",
    },
    {
      key: "month",
      label: "Mes",
      description: "Tendencia mensual para evaluar hábitos de largo plazo.",
    },
  ];
  const activePeriodLabel =
    periodLabels
      .find((item) => item.key === summaryPeriod)
      ?.label.toLowerCase() ?? "día";

  // Mientras no se resuelve el account type no renderizar nada (evita flicker)
  if (accountType === null) {
    return null;
  }

  if (accountType === "client" || accountType === "admin") {
    return null;
  }

  return (
    <div className="min-h-screen px-4 pb-10 pt-4 md:px-6 md:pt-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <section
            id="today-hero"
            role="region"
            aria-label="Hero de mascota"
            className="today-hero surface-card freeform-rise px-4 py-3 md:px-6 md:py-3"
          >
            <div className="today-hero-top flex flex-wrap items-center justify-between gap-3 md:flex-nowrap md:gap-5">
              <div className="today-hero-pet flex min-w-0 items-center gap-3 md:gap-4">
                <Link
                  href="/pet"
                  className="inline-flex"
                  title="Ajustar foto"
                  aria-label="Ajustar foto"
                >
                  <Image
                    src={primaryPet?.photo_url || "/pet_profile.jpeg"}
                    alt={`Foto de ${petLabel}`}
                    width={128}
                    height={128}
                    className="h-24 w-24 rounded-full border border-slate-200 object-cover"
                  />
                </Link>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void switchPetByOffset(-1)}
                      className="px-1 text-base font-semibold text-slate-600 hover:text-slate-900"
                      aria-label="Mascota anterior"
                      title="Mascota anterior"
                    >
                      ◀
                    </button>
                    <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">
                      {petLabel}
                    </h2>
                    <button
                      type="button"
                      onClick={() => void switchPetByOffset(1)}
                      className="px-1 text-base font-semibold text-slate-600 hover:text-slate-900"
                      aria-label="Siguiente mascota"
                      title="Siguiente mascota"
                    >
                      ▶
                    </button>
                  </div>
                  <p className="truncate text-xs text-slate-500 md:text-sm">
                    {petMeta.length
                      ? petMeta.join(" · ")
                      : "Sin datos de registro"}
                  </p>
                </div>
              </div>

              <aside className="today-hero-aside ml-auto flex w-full flex-col items-center gap-1 sm:w-auto">
                <p className="today-hero-updated text-[9px] uppercase tracking-[0.12em] text-slate-400/75">
                  Actualizado el {heroUpdatedLabel}
                </p>
                <div className="today-hero-summary inline-flex items-center gap-2">
                  <div className="today-hero-summary-cards grid grid-cols-1 gap-1.5 md:grid-cols-2">
                    <div className="today-hero-summary-card today-hero-summary-card-food flex min-h-[76px] min-w-[176px] items-center justify-between gap-2 rounded-[10px] border border-emerald-100 bg-emerald-50/50 px-3 py-2 shadow-[0_14px_24px_-20px_rgba(5,150,105,0.7)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_20px_30px_-18px_rgba(5,150,105,0.75)]">
                      <div>
                        <p className="text-xs font-semibold text-emerald-700">
                          Alimentación
                        </p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[11px] text-slate-600">
                            {consumptionPeriod === "one"
                              ? `${bowlDetailSummary.events} eventos (30d)`
                              : `${bowlConsumptionSummary[summaryPeriod].cycles} veces/${activePeriodLabel}`}
                          </p>
                          {consumptionPeriod === "one" ? (
                            <p className="text-[11px] text-slate-600">
                              Unit:{" "}
                              {formatConsumedValue(
                                bowlDetailSummary.avgConsumed,
                                "g",
                              )}{" "}
                              ·{" "}
                              {bowlDetailSummary.avgDurationMinutes === null
                                ? "N/D"
                                : formatSessionDuration(
                                    bowlDetailSummary.avgDurationMinutes,
                                  )}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-600">
                              Consumo:{" "}
                              {formatConsumedValue(
                                bowlConsumptionSummary[summaryPeriod].consumed,
                                "g",
                              )}{" "}
                              /{activePeriodLabel}
                            </p>
                          )}
                        </div>
                      </div>
                      <Image
                        src="/illustrations/icono_comida.png"
                        alt=""
                        aria-hidden={true}
                        width={36}
                        height={36}
                        className="today-hero-summary-icon h-9 w-9 shrink-0 object-contain opacity-90"
                      />
                    </div>
                    <div className="today-hero-summary-card today-hero-summary-card-water flex min-h-[76px] min-w-[176px] items-center justify-between gap-2 rounded-[10px] border border-sky-100 bg-sky-50/50 px-3 py-2 shadow-[0_14px_24px_-20px_rgba(14,116,190,0.6)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_20px_30px_-18px_rgba(14,116,190,0.7)]">
                      <div>
                        <p className="text-xs font-semibold text-sky-700">
                          Hidratación
                        </p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[11px] text-slate-600">
                            {consumptionPeriod === "one"
                              ? `${waterDetailSummary.events} eventos (30d)`
                              : `${waterConsumptionSummary[summaryPeriod].cycles} veces/${activePeriodLabel}`}
                          </p>
                          {consumptionPeriod === "one" ? (
                            <p className="text-[11px] text-slate-600">
                              Unit:{" "}
                              {formatConsumedValue(
                                waterDetailSummary.avgConsumed,
                                "ml",
                              )}{" "}
                              ·{" "}
                              {waterDetailSummary.avgDurationMinutes === null
                                ? "N/D"
                                : formatSessionDuration(
                                    waterDetailSummary.avgDurationMinutes,
                                  )}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-600">
                              Consumo:{" "}
                              {formatConsumedValue(
                                waterConsumptionSummary[summaryPeriod].consumed,
                                "ml",
                              )}{" "}
                              /{activePeriodLabel}
                            </p>
                          )}
                        </div>
                      </div>
                      <Image
                        src="/illustrations/icono_agua.png"
                        alt=""
                        aria-hidden={true}
                        width={36}
                        height={36}
                        className="today-hero-summary-icon h-9 w-9 shrink-0 object-contain opacity-90"
                      />
                    </div>
                  </div>
                  <div className="today-hero-period my-auto flex flex-col items-stretch justify-center gap-0.5 rounded-[10px] border border-slate-200 bg-white p-0.5">
                    {periodLabels.map(({ key, label, description }) => {
                      const isActive = key === consumptionPeriod;
                      return (
                        <div key={`period-${key}`} className="group relative w-full">
                          <button
                            type="button"
                            onClick={() => setConsumptionPeriod(key)}
                            className={`w-full rounded-md px-2.5 py-1 text-center text-[10px] font-semibold leading-[1.05] tracking-tight transition ${
                              isActive
                                ? "bg-emerald-400 text-slate-900"
                                : "text-slate-900 hover:bg-slate-100"
                            }`}
                            aria-pressed={isActive}
                            aria-label={`${label}: ${description}`}
                          >
                            {label}
                          </button>
                          <span className="pointer-events-none absolute right-full top-1/2 z-20 mr-2 hidden w-44 -translate-y-1/2 rounded-[10px] border border-rose-200/70 bg-rose-50/95 px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-slate-700 shadow-[0_12px_22px_-18px_rgba(15,23,42,0.55)] group-hover:block group-focus-within:block">
                            {description}
                            <span
                              aria-hidden="true"
                              className="absolute left-full top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-t border-rose-200/70 bg-rose-50/95"
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section
            id="today-bowls"
            role="region"
            aria-label="Estado de platos"
            className="surface-card freeform-rise px-4 py-4 md:px-6 md:py-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="today-bowl-card rounded-[var(--radius)] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)] transition-transform duration-200 ease-out hover:scale-[1.02] md:p-5">
                <div className="relative min-h-[180px]">
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
                    <BatteryStatusIcon
                      level={bowlDevice?.battery_level ?? null}
                      className="h-6 w-6 text-slate-700"
                    />
                  </div>
                  <div className="today-bowl-metrics absolute left-0 top-1/2 flex w-[152px] -translate-y-1/2 flex-col items-start gap-2">
                    <p className="text-[14px] font-semibold text-slate-700">
                      {bowlContentWeightText} (contenido)
                      {renderTrend(
                        bowlContentWeightGrams,
                        bowlPrevContentWeightGrams,
                      )}
                    </p>
                    <p className="text-[14px] font-semibold text-slate-700">
                      {bowlPlateWeightText} (plato)
                    </p>
                    <p className="text-[14px] font-semibold text-slate-600">
                      {bowlSensorWeightText} (sensor)
                      {renderTrend(
                        bowlGrossWeightGrams,
                        bowlPrevGrossWeightGrams,
                      )}
                    </p>
                    <div className="today-bowl-ambient mt-0.5 flex flex-col gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Ambiente
                      </p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        Temp: {bowlTempText}
                        {renderTrend(
                          toNullableNumber(bowlLatestReading?.temperature),
                          bowlPrevTemp,
                        )}
                      </p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        Hum: {bowlHumidityText}
                        {renderTrend(
                          toNullableNumber(bowlLatestReading?.humidity),
                          bowlPrevHumidity,
                        )}
                      </p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        Luz: {bowlLightText}
                        {renderTrend(
                          toNullableNumber(bowlLatestReading?.light_percent),
                          bowlPrevLight,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="relative mx-auto flex w-full max-w-[260px] flex-col items-center justify-center">
                    <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-start justify-center gap-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                        Alimentación
                      </span>
                    </div>
                    <Image
                      src="/illustrations/pink_food_full.png"
                      alt="Kittypau comedero"
                      width={208}
                      height={150}
                      className="mx-auto mt-3 h-36 w-auto scale-[1.22] object-contain object-center"
                    />
                    <p className="mt-0.5 text-center text-[9px] leading-none text-slate-400/80">
                      {bowlDevice?.device_id ?? "KPCLXXXX"}
                    </p>
                  </div>
                </div>
              </article>

              <article className="today-bowl-card rounded-[var(--radius)] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)] transition-transform duration-200 ease-out hover:scale-[1.02] md:p-5">
                <div className="relative min-h-[180px]">
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
                    <BatteryStatusIcon
                      level={waterDevice?.battery_level ?? null}
                      className="h-6 w-6 text-slate-700"
                    />
                  </div>
                  <div className="today-bowl-metrics absolute left-0 top-1/2 flex w-[152px] -translate-y-1/2 flex-col items-start gap-2">
                    <p className="text-[14px] font-semibold text-slate-700">
                      {waterVolumeCm3Text} (aprox)
                      {renderTrend(
                        waterContentWeightGrams,
                        waterPrevContentWeightGrams,
                      )}
                    </p>
                    <p className="text-[14px] font-semibold text-slate-700">
                      {waterPlateWeightText} (plato)
                    </p>
                    <p className="text-[14px] font-semibold text-slate-600">
                      {waterSensorWeightText} (sensor)
                      {renderTrend(
                        waterGrossWeightGrams,
                        waterPrevGrossWeightGrams,
                      )}
                    </p>
                    <div className="today-bowl-ambient mt-0.5 flex flex-col gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Ambiente
                      </p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        Temp: {waterTempText}
                        {renderTrend(
                          toNullableNumber(waterLatestReading?.temperature),
                          waterPrevTemp,
                        )}
                      </p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        Hum: {waterHumidityText}
                        {renderTrend(
                          toNullableNumber(waterLatestReading?.humidity),
                          waterPrevHumidity,
                        )}
                      </p>
                      <p className="text-[12px] font-semibold text-slate-600">
                        Luz: {waterLightText}
                        {renderTrend(
                          toNullableNumber(waterLatestReading?.light_percent),
                          waterPrevLight,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="relative mx-auto flex w-full max-w-[260px] flex-col items-center justify-center">
                    <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-start justify-center gap-2">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                        Hidratación
                      </span>
                    </div>
                    <Image
                      src="/illustrations/green_water_full.png"
                      alt="Kittypau bebedero"
                      width={208}
                      height={150}
                      className="mx-auto mt-3 h-36 w-auto scale-[1.22] object-contain object-center"
                    />
                    <p className="mt-0.5 text-center text-[9px] leading-none text-slate-400/80">
                      {waterDevice?.device_id ?? "KPBWXXXX"}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="surface-card freeform-rise px-4 py-4 md:px-6 md:py-5">
            <div className="rounded-[calc(var(--radius)-8px)] border border-rose-100 bg-[linear-gradient(180deg,rgba(251,207,232,0.22)_0%,rgba(236,253,245,0.22)_55%,rgba(255,255,255,0.95)_100%)] p-3 shadow-[0_10px_28px_-22px_rgba(236,72,153,0.6)]">
              <div className="mb-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setDayCycleOffsetDays((prev) => prev + 1)}
                  className="px-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
                  aria-label="Ciclo anterior"
                  title="Ciclo anterior"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => setDayCycleOffsetDays(0)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                  aria-label="Volver a hoy"
                  title="Volver a hoy"
                >
                  {dayNightRangeTitle}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDayCycleOffsetDays((prev) => Math.max(0, prev - 1))
                  }
                  disabled={dayCycleOffsetDays === 0}
                  className="px-1 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Ciclo siguiente"
                  title="Ciclo siguiente"
                >
                  ▶
                </button>
              </div>
              <div className="h-[360px] w-full rounded-[calc(var(--radius)-10px)] border border-white/70 bg-gradient-to-b from-rose-50/35 via-emerald-50/20 to-white px-2 py-2">
                <Line
                  data={dayNightChartData}
                  options={dayNightChartOptions}
                  plugins={[dayNightBackgroundPlugin]}
                />
              </div>
              {chartLoadError ? (
                <p className="mt-2 w-full text-center text-xs font-medium text-slate-500">
                  {chartLoadError}
                </p>
              ) : null}
            </div>
          </section>
        </header>

        <section className="surface-card freeform-rise px-6 py-5">
          {/* Pills de valores actuales */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(350 65% 62%)" }} />
              <span className="text-xs uppercase tracking-widest text-slate-400">Comida</span>
              <span className="font-semibold text-slate-800">{todayLatestWeight !== null ? `${todayLatestWeight} g` : "N/D"}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(25 80% 52%)" }} />
              <span className="text-xs uppercase tracking-widest text-slate-400">Temp</span>
              <span className="font-semibold text-slate-800">{todayLatestTemp !== null ? `${Math.round(todayLatestTemp)} °C` : "N/D"}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(198,70%,45%)" }} />
              <span className="text-xs uppercase tracking-widest text-slate-400">Humedad</span>
              <span className="font-semibold text-slate-800">{todayLatestHumidity !== null ? `${Math.round(todayLatestHumidity)} %` : "N/D"}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(44,90%,52%)" }} />
              <span className="text-xs uppercase tracking-widest text-slate-400">Luz</span>
              <span className="font-semibold text-slate-800">{todayLatestLight !== null ? `${Math.round(todayLatestLight)} %` : "N/D"}</span>
            </div>
          </div>
          {/* Gráfico combinado ancho */}
          <div className="h-40 w-full rounded-[calc(var(--radius)-8px)] bg-slate-50 px-3 py-3 sm:h-52">
            {(todayWeightSeries.length > 1 || todayTempSeries.length > 1 || todayHumiditySeries.length > 1 || todayLightSeries.length > 1) ? (
              <Line
                data={{
                  labels: todayWeightSeries.slice(0, 288).reverse().map((p) =>
                    new Date(p.timestamp).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
                  ),
                  datasets: [
                    {
                      label: "Comida (g)",
                      data: todayWeightSeries.slice(0, 288).reverse().map((p) => p.value),
                      borderColor: "hsl(350 65% 62%)",
                      backgroundColor: "hsl(350 65% 62%)",
                      borderWidth: 2.5,
                      pointRadius: 0,
                      tension: 0.3,
                      yAxisID: "yWeight",
                    },
                    {
                      label: "Temp (°C)",
                      data: todayTempSeries.slice(0, 288).reverse().map((p) => p.value),
                      borderColor: "hsl(25 80% 52%)",
                      backgroundColor: "hsl(25 80% 52%)",
                      borderWidth: 2,
                      pointRadius: 0,
                      tension: 0.3,
                      yAxisID: "yEnv",
                    },
                    {
                      label: "Humedad (%)",
                      data: todayHumiditySeries.slice(0, 288).reverse().map((p) => p.value),
                      borderColor: "hsl(198,70%,45%)",
                      backgroundColor: "hsl(198,70%,45%)",
                      borderWidth: 2,
                      pointRadius: 0,
                      tension: 0.3,
                      yAxisID: "yEnv",
                    },
                    {
                      label: "Luz (%)",
                      data: todayLightSeries.slice(0, 288).reverse().map((p) => p.value),
                      borderColor: "hsl(44,90%,52%)",
                      backgroundColor: "hsl(44,90%,52%)",
                      borderWidth: 2,
                      pointRadius: 0,
                      tension: 0.3,
                      yAxisID: "yEnv",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 340, easing: "easeOutQuart" },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      mode: "index",
                      intersect: false,
                      backgroundColor: "rgba(15,23,42,0.92)",
                      titleColor: "#f8fafc",
                      bodyColor: "#f8fafc",
                      borderColor: "rgba(148,163,184,0.35)",
                      borderWidth: 1,
                      displayColors: true,
                    },
                  },
                  interaction: { mode: "nearest", intersect: false },
                  scales: {
                    x: {
                      grid: { display: false },
                      border: { display: true, color: "color-mix(in oklab, hsl(var(--muted-foreground)) 24%, transparent)" },
                      ticks: {
                        maxTicksLimit: 2,
                        color: "hsl(var(--muted-foreground))",
                        font: { size: 11 },
                        autoSkip: false,
                        maxRotation: 0,
                        callback: (_v, i, ticks) => i === 0 ? "-3d" : i === ticks.length - 1 ? "Ahora" : "",
                      },
                    },
                    yWeight: {
                      type: "linear",
                      position: "left",
                      grid: { drawOnChartArea: false },
                      border: { display: true, color: "color-mix(in oklab, hsl(var(--muted-foreground)) 24%, transparent)" },
                      ticks: { color: "hsl(350 65% 62%)", font: { size: 10 }, maxTicksLimit: 3, callback: (v) => `${v}g` },
                    },
                    yEnv: {
                      type: "linear",
                      position: "right",
                      grid: { drawOnChartArea: false },
                      border: { display: true, color: "color-mix(in oklab, hsl(var(--muted-foreground)) 24%, transparent)" },
                      ticks: { color: "hsl(25 80% 52%)", font: { size: 10 }, maxTicksLimit: 3, callback: (v) => `${v}` },
                    },
                  },
                }}
              />
            ) : (
              <p className="text-xs text-slate-500">Aún sin lecturas recientes.</p>
            )}
          </div>
        </section>

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
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="relative rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 pr-20 text-sm text-slate-600 md:pr-24"
              >
                {stat.icon ? (
                  <div className="absolute inset-y-3 right-4 flex w-16 items-center justify-center md:w-20">
                    <Image
                      src={stat.icon}
                      alt=""
                      aria-hidden={true}
                      width={80}
                      height={80}
                      className="max-h-full max-w-full object-contain opacity-95"
                    />
                  </div>
                ) : null}
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {stat.value}
                </p>
              </div>
            ))}
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

        {!state.isLoading && !state.error && (!primaryPet || !primaryDevice) ? (
          <section className="surface-card freeform-rise px-6 py-5 text-sm text-slate-600">
            <p className="mb-3">
              Aún no tienes todo el registro completo. Completa perfil, mascota
              y dispositivo para ver el feed.
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
                        <Image
                          src={card.icon}
                          alt=""
                          aria-hidden={true}
                          width={36}
                          height={36}
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
