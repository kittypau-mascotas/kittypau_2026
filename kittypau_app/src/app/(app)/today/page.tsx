"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getValidAccessToken, signOutSession } from "@/lib/auth/token";
import { authFetch } from "@/lib/auth/auth-fetch";
import "@/lib/charts";
import { useMqttLive } from "@/lib/hooks/useMqttLive";
import {
  syncSelectedDevice,
  syncSelectedPet,
} from "@/lib/runtime/selection-sync";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import { parseListResponse, resolveDevicePowerState } from "@/lib/utils/api";
import { type ChartData, type ChartOptions, type Plugin } from "chart.js";
import { Line } from "react-chartjs-2";
import {
  getChileDayNightWindow,
  chileCompactDatetime,
  chileShortTime,
  chileLongDate,
} from "@/lib/time/chile";

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
  plan?: "free" | "premium" | null;
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
  battery_state: string | null;
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

type HungerBarResponse = {
  status: "ok" | "sin_datos" | "sin_dispositivo";
  percentage: number | null;
  lastMealDetectedAt: string | null;
  estimatedNextMealAt: string | null;
  intervalUsedMinutes: number | null;
  usingFallback: boolean;
  sampleSize: number;
  alertActive: boolean;
  hoursOverdue: number | null;
};

// v1.1 — gradiente continuo verde→amarillo→rojo. Ver
// Knowledge/05_API/SPEC_HungerBar_Alertas.md §2.
function hungerBarColor(pct: number): string {
  const hue = Math.max(0, Math.min(100, pct)) * 1.2;
  return `hsl(${hue}, 70%, 45%)`;
}

type DayNightPoint = { x: number; y: number; t: number };

type AuditEvent = {
  id: string;
  created_at: string;
  category: string;
  category_label: string;
  category_type?: "alimentacion" | "servido" | "hidratacion" | null;
  snapshot?: {
    weight_grams?: number | null;
    plate_weight_grams?: number | null;
    content_weight_grams?: number | null;
    sensor_recorded_at?: string | null;
  } | null;
};

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

type WellnessState = {
  stateLabel: string;
  actionLabel: string;
  levelLabel: string;
  lastEventLabel: string;
  hasEvidence: boolean;
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
  return chileCompactDatetime(value);
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

function parseCursor(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "next_cursor" in payload) {
    return (payload as { next_cursor?: string | null }).next_cursor ?? null;
  }
  return null;
}

function parseProfile(payload: unknown): ApiProfile | null {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    return (payload[0] as ApiProfile) ?? null;
  }
  return payload as ApiProfile;
}

function getDayNightWindow(now = new Date()) {
  return getChileDayNightWindow(now);
}

function formatHourFromOffset(offsetHours: number) {
  const rounded = Math.round(offsetHours);
  const hour = (((6 + rounded) % 24) + 24) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatSessionClock(ts: number) {
  return chileShortTime(ts);
}

function formatSessionDuration(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatSessionDurationClock(minutes: number) {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatCycleDate(ts: number) {
  return chileLongDate(ts);
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

// Convierte pares inicio/termino de audit_events en IntakeSessions usando los puntos del gráfico.
// Prioridad sobre el heurístico cuando existen etiquetas confirmadas por el operador.
function buildAuditSessions(
  events: AuditEvent[],
  points: DayNightPoint[],
  startCategory: string,
  endCategory: string,
): IntakeSession[] {
  if (!points.length || !events.length) return [];
  const sessions: IntakeSession[] = [];

  const starts = events.filter((e) => e.category === startCategory);
  const ends = events.filter((e) => e.category === endCategory);

  for (const start of starts) {
    const startMs = new Date(start.created_at).getTime();
    const end = ends.find((e) => new Date(e.created_at).getTime() > startMs);
    if (!end) continue;
    const endMs = new Date(end.created_at).getTime();

    // Encontrar los índices de puntos más cercanos al inicio y fin
    let si = 0;
    let ei = points.length - 1;
    let minStartDiff = Infinity;
    let minEndDiff = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dStart = Math.abs(points[i].t - startMs);
      const dEnd = Math.abs(points[i].t - endMs);
      if (dStart < minStartDiff) {
        minStartDiff = dStart;
        si = i;
      }
      if (dEnd < minEndDiff) {
        minEndDiff = dEnd;
        ei = i;
      }
    }
    if (si >= ei) continue;

    const startPt = points[si];
    const endPt = points[ei];
    const consumed = Math.max(0, Math.round(startPt.y - endPt.y));
    const durationMinutes = (endMs - startMs) / 60000;
    if (durationMinutes <= 0) continue;

    sessions.push({
      startIndex: si,
      endIndex: ei,
      startX: startPt.x,
      endX: endPt.x,
      startT: startMs,
      endT: endMs,
      startValue: startPt.y,
      endValue: endPt.y,
      consumed,
      durationMinutes,
    });
  }
  return sessions;
}

function buildAuditEventPairs(
  events: AuditEvent[],
  startCategory: string,
  endCategory: string,
) {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const open: AuditEvent[] = [];
  const closed: Array<{ start: AuditEvent; end: AuditEvent }> = [];

  for (const event of sorted) {
    if (event.category === startCategory) {
      open.push(event);
      continue;
    }
    if (event.category !== endCategory) continue;
    const start = open.shift();
    if (!start) continue;
    if (
      new Date(event.created_at).getTime() <=
      new Date(start.created_at).getTime()
    ) {
      continue;
    }
    closed.push({ start, end: event });
  }

  return { closed, open };
}

function getSnapshotContentWeight(event: AuditEvent): number | null {
  const snapshot = event.snapshot;
  if (!snapshot) return null;
  const content = toNullableNumber(snapshot.content_weight_grams);
  if (content !== null) return Math.max(0, content);
  const weight = toNullableNumber(snapshot.weight_grams);
  if (weight === null) return null;
  const plate = toNullableNumber(snapshot.plate_weight_grams) ?? 0;
  return Math.max(0, weight - plate);
}

function getEventContentWeightWithFallback(
  event: AuditEvent,
  readings: ApiReading[],
  valueSelector: (reading: ApiReading) => number | null,
): number | null {
  const snapshotValue = getSnapshotContentWeight(event);
  if (snapshotValue !== null) return snapshotValue;
  if (!readings.length) return null;

  const eventTs = new Date(event.created_at).getTime();
  if (Number.isNaN(eventTs)) return null;

  const MAX_DELTA_MS = 20 * 60 * 1000; // 20 min
  let bestValue: number | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const reading of readings) {
    const ts = new Date(reading.recorded_at).getTime();
    if (Number.isNaN(ts)) continue;
    const delta = Math.abs(ts - eventTs);
    if (delta > MAX_DELTA_MS || delta >= bestDelta) continue;
    const value = valueSelector(reading);
    if (value === null) continue;
    bestDelta = delta;
    bestValue = Math.max(0, value);
  }

  return bestValue;
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

function buildWellnessState(params: {
  type: "food" | "water";
  sessions: IntakeSession[];
}): WellnessState {
  const latestSession =
    [...params.sessions].sort((a, b) => b.endT - a.endT)[0] ?? null;
  if (!latestSession) {
    return {
      stateLabel: "Sin evidencia real",
      actionLabel:
        params.type === "food"
          ? "Solo mostraremos alimentación confirmada con eventos reales."
          : "Aún no hay eventos reales confirmados para hidratación.",
      levelLabel: "Sin confirmación",
      lastEventLabel:
        params.type === "food"
          ? "Última comida confirmada: sin registro"
          : "Último consumo confirmado: sin registro",
      hasEvidence: false,
    };
  }

  return {
    stateLabel: "Confirmado",
    actionLabel:
      params.type === "food"
        ? "Basado solo en eventos reales de inicio y término de alimentación."
        : "Basado solo en eventos reales de hidratación.",
    levelLabel: params.type === "food" ? "Evento auditado" : "Evento auditado",
    lastEventLabel:
      params.type === "food"
        ? `Última comida confirmada: ${formatTimestamp(new Date(latestSession.endT).toISOString())}`
        : `Último consumo confirmado: ${formatTimestamp(new Date(latestSession.endT).toISOString())}`,
    hasEvidence: true,
  };
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const WELLNESS_BLOCKS = 20;
const AUTHORITATIVE_FOOD_DEVICE_CODE = "KPCL0034";
const FOOD_START_CATEGORY = "inicio_alimentacion";
const FOOD_END_CATEGORY = "termino_alimentacion";
const WATER_START_CATEGORY = "inicio_hidratacion";
const WATER_END_CATEGORY = "termino_hidratacion";
const TODAY_AUDIT_CATEGORIES = [
  "inicio_servido",
  "termino_servido",
  "inicio_alimentacion",
  "termino_alimentacion",
  "inicio_hidratacion",
  "termino_hidratacion",
] as const;
const BAR_MAX_TERMINO_SERVIDO_KEY_PREFIX = "kittypau_bar_max_termino_servido_";

function isAuthoritativeFoodDeviceCode(value?: string | null): boolean {
  return (value ?? "").toUpperCase() === AUTHORITATIVE_FOOD_DEVICE_CODE;
}

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
  const [bowlStoredMaxTerminoServido, setBowlStoredMaxTerminoServido] =
    useState<number | null>(null);
  const [chartLoadError, setChartLoadError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [bowlPlateOverrides, setBowlPlateOverrides] = useState<
    Record<string, number>
  >({});
  const [bowlLastEmptyWeight, setBowlLastEmptyWeight] = useState<
    Record<string, number>
  >({});
  const [bowlTareOffsets, setBowlTareOffsets] = useState<
    Record<string, number>
  >({});
  const onPetChangeRef = useRef<((e: Event) => void) | null>(null);
  const onDeviceChangeRef = useRef<((e: Event) => void) | null>(null);
  const [waterPlateOverrides, setWaterPlateOverrides] = useState<
    Record<string, number>
  >({});
  const [waterLastEmptyWeight, setWaterLastEmptyWeight] = useState<
    Record<string, number>
  >({});
  const [waterTareOffsets, setWaterTareOffsets] = useState<
    Record<string, number>
  >({});
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [accountType, setAccountType] = useState<
    "admin" | "tester" | "client" | null
  >(null);
  const [dayCycleOffsetDays, setDayCycleOffsetDays] = useState(0);
  const [deviceAuditEvents, setDeviceAuditEvents] = useState<
    Record<string, AuditEvent[]>
  >({});
  // device_id en formato KPCL (texto) para suscripción MQTT
  const mqttDeviceId = useMemo(
    () =>
      state.devices.find((d) => d.id === selectedDeviceId)?.device_id ?? null,
    [state.devices, selectedDeviceId],
  );

  // Live readings directo desde HiveMQ WebSocket
  const { reading: liveReading, error: mqttLiveError } =
    useMqttLive(mqttDeviceId);

  useEffect(() => {
    if (!liveReading || !selectedDeviceId) return;
    const asReading: ApiReading = {
      id: `live-${liveReading.receivedAt}`,
      device_id: selectedDeviceId,
      recorded_at: liveReading.receivedAt,
      weight_grams: liveReading.weight,
      water_ml: null,
      flow_rate: null,
      temperature: liveReading.temperature,
      humidity: liveReading.humidity,
      light_percent: liveReading.lightPercent,
      battery_level: liveReading.batteryLevel,
    };
    setState((prev) => {
      const exists = prev.readings.some((r) => r.id === asReading.id);
      if (exists) return prev;
      return { ...prev, readings: [asReading, ...prev.readings].slice(0, 120) };
    });
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
        if (nextType === "admin") {
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

  const loadReadings = useCallback(
    async (
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
    },
    [],
  );

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
        const resolvedPet =
          pets.find((pet) => pet.id === primaryDevice?.pet_id) ?? primaryPet;
        const initialDeviceId = primaryDevice?.id ?? null;
        setSelectedPetId(resolvedPet?.id ?? null);
        setSelectedDeviceId(initialDeviceId);
        if (resolvedPet?.id) {
          syncSelectedPet(resolvedPet.id, resolvedPet.name ?? "");
        }
        if (initialDeviceId) {
          syncSelectedDevice(initialDeviceId);
        }
        if (initialDeviceId) {
          const result = await loadReadings(initialDeviceId);
          readings = result.data;
          readingsCursor = result.nextCursor;
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
  }, [isAuthed, loadReadings]);

  useEffect(() => {
    if (!isAuthed || typeof window === "undefined") return;
    const seen = window.localStorage.getItem("kittypau_guide_seen");
    if (!seen) {
      setShowGuide(true);
    }
  }, [isAuthed]);

  // Live readings manejados por useMqttLive + useEffect arriba

  // Handlers asignados en cada render para que el effect de mount siempre use closures frescas
  onPetChangeRef.current = async (event: Event) => {
    const custom = event as CustomEvent<{ petId?: string; petName?: string }>;
    const nextPetId = custom.detail?.petId ?? null;
    if (!nextPetId || nextPetId === selectedPetId) return;

    const nextPet =
      state.pets.find((pet) => pet.id === nextPetId) ??
      (custom.detail?.petName
        ? { id: nextPetId, name: custom.detail.petName }
        : null);
    if (!nextPet) return;

    const storedDeviceId =
      window.localStorage.getItem("kittypau_device_id") ?? null;
    const petSuffix = parsePetNumberSuffix(nextPet.name);
    const expectedFoodDeviceId = petSuffix
      ? kpclLabelFromNumber(petSuffix)
      : null;
    const devicesByPet = state.devices.filter(
      (device) => device.pet_id === nextPet.id,
    );
    const nextDevice =
      devicesByPet.find((device) => device.id === storedDeviceId) ??
      devicesByPet.find(
        (device) =>
          (device.device_id ?? "").toUpperCase() === expectedFoodDeviceId,
      ) ??
      devicesByPet[0] ??
      state.devices.find((device) => device.id === storedDeviceId) ??
      state.devices.find(
        (device) =>
          (device.device_id ?? "").toUpperCase() === expectedFoodDeviceId,
      ) ??
      null;

    setSelectedPetId(nextPet.id);
    syncSelectedPet(nextPet.id, nextPet.name ?? "");
    setSelectedDeviceId(nextDevice?.id ?? null);
    syncSelectedDevice(nextDevice?.id ?? null);

    if (!nextDevice?.id) {
      setState((prev) => ({
        ...prev,
        readings: [],
        readingsCursor: null,
      }));
      return;
    }

    try {
      const result = await loadReadings(nextDevice.id);
      setState((prev) => ({
        ...prev,
        readings: result.data,
        readingsCursor: result.nextCursor,
      }));
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

  onDeviceChangeRef.current = async (event: Event) => {
    const custom = event as CustomEvent<{ deviceId?: string }>;
    const nextId = custom.detail?.deviceId ?? null;
    if (!nextId || nextId === selectedDeviceId) return;
    const nextDevice = state.devices.find((device) => device.id === nextId);
    const nextPet = nextDevice?.pet_id
      ? (state.pets.find((pet) => pet.id === nextDevice.pet_id) ?? null)
      : null;
    if (nextPet?.id && nextPet.id !== selectedPetId) {
      setSelectedPetId(nextPet.id);
      syncSelectedPet(nextPet.id, nextPet.name ?? "");
    }
    setSelectedDeviceId(nextId);
    syncSelectedDevice(nextId);
    try {
      const result = await loadReadings(nextId);
      setState((prev) => ({
        ...prev,
        readings: result.data,
        readingsCursor: result.nextCursor,
      }));
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const petH = (e: Event) => onPetChangeRef.current?.(e);
    const devH = (e: Event) => onDeviceChangeRef.current?.(e);
    window.addEventListener("kittypau-pet-change", petH);
    window.addEventListener("kittypau-device-change", devH);
    return () => {
      window.removeEventListener("kittypau-pet-change", petH);
      window.removeEventListener("kittypau-device-change", devH);
    };
  }, []);

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
  const [hungerBar, setHungerBar] = useState<HungerBarResponse | null>(null);
  useEffect(() => {
    if (!primaryPet?.id) {
      setHungerBar(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      authFetch(`/api/pets/${primaryPet.id}/hunger-bar`)
        .then((res) =>
          res.ok ? (res.json() as Promise<HungerBarResponse>) : null,
        )
        .then((data) => {
          if (!cancelled) setHungerBar(data);
        })
        .catch(() => {
          if (!cancelled) setHungerBar(null);
        });
    };
    load();
    const interval = setInterval(load, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [primaryPet?.id]);

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
        (device.device_type ?? "").toLowerCase().includes("comedero") ||
        (device.device_type ?? "").toLowerCase().includes("food"),
    ) ??
    petDevices.find(
      (device) =>
        device.device_id?.toUpperCase().includes("KPCL") &&
        !(device.device_type ?? "").toLowerCase().includes("bebedero") &&
        !(device.device_type ?? "").toLowerCase().includes("water"),
    ) ??
    primaryDevice;
  const baseWaterDevice =
    petDevices.find(
      (device) =>
        (device.device_id ?? "").toUpperCase() === expectedWaterDeviceCode,
    ) ??
    petDevices.find((device) => {
      const id = (device.device_id ?? "").toUpperCase();
      const type = (device.device_type ?? "").toLowerCase();
      return (
        type.includes("bebedero") ||
        type.includes("water") ||
        id.includes("KPBW") ||
        id.includes("KPW")
      );
    }) ??
    null;
  const waterDevice =
    baseWaterDevice ??
    (bowlDevice
      ? (petDevices.find((device) => device.id !== bowlDevice.id) ?? null)
      : null);
  const hasFoodDevice = petDevices.length > 0;
  const hasWaterDevice = waterDevice !== null;
  const isAuthoritativeFoodDevice = isAuthoritativeFoodDeviceCode(
    bowlDevice?.device_id,
  );
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
      } catch {
        // Keep current state if sync fetch fails; hero still reads from dedicated device map.
      }
    };
    void syncLivePanelDevice();
    return () => {
      active = false;
    };
  }, [bowlDevice?.id, selectedDeviceId, loadReadings]);

  useEffect(() => {
    const targetIds = [bowlDevice?.id, waterDevice?.id].filter(
      (value, index, arr): value is string =>
        Boolean(value) && arr.indexOf(value) === index,
    );
    if (!targetIds.length) return;
    let active = true;
    let inFlight = false;
    let interval: number | null = null;
    const loadTargets = async () => {
      if (inFlight) return;
      inFlight = true;
      const entries = await Promise.all(
        targetIds.map(async (deviceId) => {
          try {
            const result = await loadReadings(deviceId, null, 2);
            return {
              deviceId,
              latest: result.data[0] ?? null,
              previous: result.data[1] ?? null,
              ok: true,
            } as const;
          } catch {
            return {
              deviceId,
              latest: null,
              previous: null,
              ok: false,
            } as const;
          }
        }),
      );
      if (!active) {
        inFlight = false;
        return;
      }
      const successful = entries.filter((e) => e.ok);
      if (successful.length > 0) {
        setDeviceLatestReadings((prev) => ({
          ...prev,
          ...Object.fromEntries(successful.map((e) => [e.deviceId, e.latest])),
        }));
        setDevicePreviousReadings((prev) => ({
          ...prev,
          ...Object.fromEntries(
            successful.map((e) => [e.deviceId, e.previous]),
          ),
        }));
      }
      inFlight = false;
    };
    void loadTargets();
    interval = window.setInterval(loadTargets, 15_000);
    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
    };
  }, [bowlDevice?.id, waterDevice?.id, loadReadings]);

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
            const result = await loadReadings(deviceId, null, 5000, {
              from: cycleFrom,
              to: cycleTo,
            });
            return { deviceId, data: result.data, ok: true } as const;
          } catch {
            return { deviceId, data: [] as ApiReading[], ok: false } as const;
          }
        }),
      );
      if (!active) return;
      const successfulChart = entries.filter((e) => e.ok);
      if (successfulChart.length > 0) {
        setDeviceChartReadings((prev) => ({
          ...prev,
          ...Object.fromEntries(
            successfulChart.map((e) => [e.deviceId, e.data]),
          ),
        }));
      }
      const hasAnyData = entries.some((e) => e.data.length > 0);
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
  }, [bowlDevice?.id, dayCycleOffsetDays, waterDevice?.id, loadReadings]);

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
  }, [bowlDevice?.id, waterDevice?.id, loadReadings]);

  // Cargar audit_events (inicio/termino alimentacion e hidratacion) para los devices activos.
  // Se recargan cuando cambia el device o el offset del día seleccionado.
  useEffect(() => {
    const targetIds = [bowlDevice?.id, waterDevice?.id].filter(
      (v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i,
    );
    if (!targetIds.length) return;
    let active = true;
    const loadAuditEvents = async () => {
      const lookbackDays = Math.max(180, dayCycleOffsetDays + 2);
      const from = new Date(
        Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const to = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const entries = await Promise.all(
        targetIds.map(async (deviceId) => {
          try {
            const res = await authFetch(
              `/api/devices/${deviceId}/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&categories=${encodeURIComponent(TODAY_AUDIT_CATEGORIES.join(","))}`,
            );
            if (!res.ok) return [deviceId, []] as const;
            const payload = await res.json();
            return [deviceId, (payload.data ?? []) as AuditEvent[]] as const;
          } catch {
            return [deviceId, []] as const;
          }
        }),
      );
      if (!active) return;
      setDeviceAuditEvents((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    };
    void loadAuditEvents();
    return () => {
      active = false;
    };
  }, [bowlDevice?.id, waterDevice?.id, dayCycleOffsetDays]);

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
  const bowlPlateWeightGrams = toNullableNumber(bowlDevice?.plate_weight_grams);
  const bowlPlateWeightOverride =
    bowlDevice?.id && bowlPlateOverrides[bowlDevice.id] !== undefined
      ? bowlPlateOverrides[bowlDevice.id]
      : null;
  const bowlPlateWeightEffective =
    bowlPlateWeightOverride !== null
      ? bowlPlateWeightOverride
      : bowlPlateWeightGrams;
  const bowlGrossWeightGrams = toNullableNumber(
    bowlLatestReading?.weight_grams,
  );
  const bowlRawContentWeightGrams =
    bowlGrossWeightGrams !== null
      ? Math.max(
          0,
          bowlPlateWeightEffective !== null
            ? bowlGrossWeightGrams - bowlPlateWeightEffective
            : bowlGrossWeightGrams,
        )
      : null;
  const bowlTareOffset =
    bowlDevice?.id && bowlTareOffsets[bowlDevice.id] !== undefined
      ? bowlTareOffsets[bowlDevice.id]
      : 0;
  const bowlContentWeightGrams =
    bowlRawContentWeightGrams !== null
      ? Math.max(0, bowlRawContentWeightGrams - bowlTareOffset)
      : null;
  const bowlContentWeightText =
    bowlContentWeightGrams !== null
      ? `${Math.round(bowlContentWeightGrams)} g`
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
  const waterPlateWeightGrams = toNullableNumber(
    waterDevice?.plate_weight_grams,
  );
  const waterPlateWeightOverride =
    waterDevice?.id && waterPlateOverrides[waterDevice.id] !== undefined
      ? waterPlateOverrides[waterDevice.id]
      : null;
  const waterPlateWeightEffective =
    waterPlateWeightOverride !== null
      ? waterPlateWeightOverride
      : waterPlateWeightGrams;
  const waterGrossWeightGrams = toNullableNumber(
    waterLatestReading?.weight_grams,
  );
  const waterRawContentWeightGrams =
    waterGrossWeightGrams !== null
      ? Math.max(
          0,
          waterPlateWeightEffective !== null
            ? waterGrossWeightGrams - waterPlateWeightEffective
            : waterGrossWeightGrams,
        )
      : null;
  const waterTareOffset =
    waterDevice?.id && waterTareOffsets[waterDevice.id] !== undefined
      ? waterTareOffsets[waterDevice.id]
      : 0;
  const waterContentWeightGrams =
    waterRawContentWeightGrams !== null
      ? Math.max(0, waterRawContentWeightGrams - waterTareOffset)
      : null;
  const waterVolumeMlText =
    waterContentWeightGrams !== null
      ? `${Math.round(waterContentWeightGrams)} mL`
      : "N/D";
  const bowlPrevGrossWeightGrams = toNullableNumber(
    bowlPreviousReading?.weight_grams,
  );
  const bowlPrevContentWeightGrams =
    bowlPrevGrossWeightGrams !== null
      ? Math.max(
          0,
          bowlPlateWeightEffective !== null
            ? bowlPrevGrossWeightGrams - bowlPlateWeightEffective
            : bowlPrevGrossWeightGrams,
        )
      : null;
  const waterPrevGrossWeightGrams = toNullableNumber(
    waterPreviousReading?.weight_grams,
  );
  const waterPrevContentWeightGrams =
    waterPrevGrossWeightGrams !== null
      ? Math.max(
          0,
          waterPlateWeightEffective !== null
            ? waterPrevGrossWeightGrams - waterPlateWeightEffective
            : waterPrevGrossWeightGrams,
        )
      : null;
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
  }, [dayCycleOffsetDays]);
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
    } catch (err) {}
  };
  const bowlChartReadings = useMemo(
    () => (bowlDevice?.id ? (deviceChartReadings[bowlDevice.id] ?? []) : []),
    [bowlDevice?.id, deviceChartReadings],
  );
  const waterChartReadings = useMemo(
    () => (waterDevice?.id ? (deviceChartReadings[waterDevice.id] ?? []) : []),
    [waterDevice?.id, deviceChartReadings],
  );

  const selectBowlSeriesValue = useCallback(
    (reading: ApiReading) => {
      const gross = toNullableNumber(reading.weight_grams);
      if (gross === null) return null;
      const base =
        bowlPlateWeightEffective !== null
          ? Math.max(0, gross - bowlPlateWeightEffective)
          : gross;
      const offset =
        bowlDevice?.id && bowlTareOffsets[bowlDevice.id] !== undefined
          ? bowlTareOffsets[bowlDevice.id]
          : 0;
      return Math.max(0, base - offset);
    },
    [bowlPlateWeightEffective, bowlDevice?.id, bowlTareOffsets],
  );

  const selectWaterSeriesValue = useCallback(
    (reading: ApiReading) => {
      const waterMl = toNullableNumber(reading.water_ml);
      if (waterMl !== null) return Math.max(0, waterMl);
      const gross = toNullableNumber(reading.weight_grams);
      if (gross === null) return null;
      const base =
        waterPlateWeightEffective !== null
          ? Math.max(0, gross - waterPlateWeightEffective)
          : gross;
      const offset =
        waterDevice?.id && waterTareOffsets[waterDevice.id] !== undefined
          ? waterTareOffsets[waterDevice.id]
          : 0;
      return Math.max(0, base - offset);
    },
    [waterPlateWeightEffective, waterDevice?.id, waterTareOffsets],
  );

  useEffect(() => {
    if (!bowlDevice?.id || typeof window === "undefined") {
      setBowlStoredMaxTerminoServido(null);
      return;
    }
    const key = `${BAR_MAX_TERMINO_SERVIDO_KEY_PREFIX}${bowlDevice.id}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      setBowlStoredMaxTerminoServido(null);
      return;
    }
    const parsed = Number(raw);
    setBowlStoredMaxTerminoServido(
      Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    );
  }, [bowlDevice?.id]);

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
      selectBowlSeriesValue,
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
      selectWaterSeriesValue,
    ],
  );

  const bowlReferenceReadings = useMemo(
    () => [
      ...bowlChartReadings,
      ...(bowlDevice?.id ? (deviceHistoryReadings[bowlDevice.id] ?? []) : []),
    ],
    [bowlChartReadings, bowlDevice?.id, deviceHistoryReadings],
  );

  const waterReferenceReadings = useMemo(
    () => [
      ...waterChartReadings,
      ...(waterDevice?.id ? (deviceHistoryReadings[waterDevice.id] ?? []) : []),
    ],
    [deviceHistoryReadings, waterChartReadings, waterDevice?.id],
  );

  const bowlIntakeSessions = useMemo(() => {
    if (!isAuthoritativeFoodDevice) return [];
    return buildAuditSessions(
      deviceAuditEvents[bowlDevice?.id ?? ""] ?? [],
      bowlDayNightPoints,
      FOOD_START_CATEGORY,
      FOOD_END_CATEGORY,
    );
  }, [
    bowlDayNightPoints,
    bowlDevice?.id,
    deviceAuditEvents,
    isAuthoritativeFoodDevice,
  ]);

  const waterIntakeSessions = useMemo(() => {
    return buildAuditSessions(
      deviceAuditEvents[waterDevice?.id ?? ""] ?? [],
      waterDayNightPoints,
      WATER_START_CATEGORY,
      WATER_END_CATEGORY,
    );
  }, [waterDayNightPoints, deviceAuditEvents, waterDevice?.id]);

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
              const point = items[0]?.parsed;
              if (!point || typeof point.x !== "number") return "";
              const d = new Date(
                dayNightWindow.startMs + point.x * 60 * 60 * 1000,
              );
              const hh = d.getHours().toString().padStart(2, "0");
              const mi = d.getMinutes().toString().padStart(2, "0");
              const dd = d.getDate().toString().padStart(2, "0");
              const mo = (d.getMonth() + 1).toString().padStart(2, "0");
              const aa = d.getFullYear().toString().slice(2);
              return `${hh}:${mi}  ${dd}/${mo}/${aa}`;
            },
            label: (context) => {
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
              const isHydration = label.includes("Hidratación");
              const unit = isHydration ? "cm3 (aprox)" : "g";
              const valueText = value === null ? "N/D" : `${value} ${unit}`;
              return [`${seriesTitle}: ${valueText}`];
            },
            afterLabel: (context) => {
              const label = context.dataset.label ?? "Serie";
              const isHydration = label.includes("Hidratación");
              const unit = isHydration ? "cm3 (aprox)" : "g";
              const isFood = context.datasetIndex === 0;
              const sessions = isFood
                ? bowlIntakeSessions
                : waterIntakeSessions;
              const session = findSessionForPoint(sessions, context.dataIndex);
              if (!session) {
                return isFood
                  ? ["Sin evidencia auditada de alimentación"]
                  : ["Sin evento registrado"];
              }
              const deviceId = isFood
                ? (bowlDevice?.id ?? "")
                : (waterDevice?.id ?? "");
              const auditEvents = deviceAuditEvents[deviceId] ?? [];
              const startCat = isHydration
                ? WATER_START_CATEGORY
                : FOOD_START_CATEGORY;
              const isConfirmed = auditEvents.some(
                (e) =>
                  e.category === startCat &&
                  Math.abs(new Date(e.created_at).getTime() - session.startT) <
                    5 * 60 * 1000,
              );
              const statusLabel = isFood
                ? "✓ Alimentación confirmada (audit_event)"
                : isConfirmed
                  ? "✓ Hidratación confirmada"
                  : "Hidratación detectada";
              return [
                statusLabel,
                `Inicio: ${formatSessionClock(session.startT)}`,
                `Fin: ${formatSessionClock(session.endT)}`,
                `Duración: ${formatSessionDuration(session.durationMinutes)}`,
                `Consumo: ${Math.round(session.consumed)} ${unit}`,
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

  const nowMs = useMemo(() => Date.now(), []);
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
          const base =
            bowlPlateWeightEffective !== null
              ? Math.max(0, gross - bowlPlateWeightEffective)
              : gross;
          const offset =
            bowlDevice?.id && bowlTareOffsets[bowlDevice.id] !== undefined
              ? bowlTareOffsets[bowlDevice.id]
              : 0;
          return Math.max(0, base - offset);
        },
      ),
    [
      bowlDevice?.id,
      bowlPlateWeightEffective,
      bowlTareOffsets,
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
          const base =
            waterPlateWeightEffective !== null
              ? Math.max(0, gross - waterPlateWeightEffective)
              : gross;
          const offset =
            waterDevice?.id && waterTareOffsets[waterDevice.id] !== undefined
              ? waterTareOffsets[waterDevice.id]
              : 0;
          return Math.max(0, base - offset);
        },
      ),
    [
      waterDevice?.id,
      waterPlateWeightEffective,
      waterTareOffsets,
      deviceHistoryReadings,
      monthStartMs,
      nowMs,
    ],
  );
  const bowlHistorySessions = useMemo(() => {
    if (!isAuthoritativeFoodDevice) return [];
    return buildAuditSessions(
      deviceAuditEvents[bowlDevice?.id ?? ""] ?? [],
      bowlHistoryPoints,
      FOOD_START_CATEGORY,
      FOOD_END_CATEGORY,
    );
  }, [
    bowlDevice?.id,
    bowlHistoryPoints,
    deviceAuditEvents,
    isAuthoritativeFoodDevice,
  ]);
  const waterHistorySessions = useMemo(() => {
    return buildAuditSessions(
      deviceAuditEvents[waterDevice?.id ?? ""] ?? [],
      waterHistoryPoints,
      WATER_START_CATEGORY,
      WATER_END_CATEGORY,
    );
  }, [deviceAuditEvents, waterDevice?.id, waterHistoryPoints]);
  const bowlWellness = useMemo(
    () =>
      buildWellnessState({
        type: "food",
        sessions: bowlHistorySessions,
      }),
    [bowlHistorySessions],
  );
  const waterWellness = useMemo(
    () =>
      buildWellnessState({
        type: "water",
        sessions: waterHistorySessions,
      }),
    [waterHistorySessions],
  );

  // 100% = máximo peso de contenido registrado en eventos auditados de "termino_servido".
  const bowlMaxServedContentGrams = useMemo(() => {
    const events = deviceAuditEvents[bowlDevice?.id ?? ""] ?? [];
    const values = events
      .filter((event) => event.category === "termino_servido")
      .map((event) =>
        getEventContentWeightWithFallback(
          event,
          bowlReferenceReadings,
          selectBowlSeriesValue,
        ),
      )
      .filter((value): value is number => value !== null && value > 0);
    if (!values.length) return null;
    return Math.max(...values);
  }, [
    bowlDevice?.id,
    bowlReferenceReadings,
    deviceAuditEvents,
    selectBowlSeriesValue,
  ]);

  useEffect(() => {
    if (
      !bowlDevice?.id ||
      bowlMaxServedContentGrams !== null ||
      bowlStoredMaxTerminoServido !== null
    ) {
      return;
    }
    const terminoEvents = (deviceAuditEvents[bowlDevice.id] ?? [])
      .filter((event) => event.category === "termino_servido")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 60);
    if (!terminoEvents.length) return;

    let active = true;
    const resolveMaxFromTerminoEvents = async () => {
      let maxValue = 0;
      for (const event of terminoEvents) {
        if (!active) return;
        let content = getEventContentWeightWithFallback(
          event,
          bowlReferenceReadings,
          selectBowlSeriesValue,
        );
        if (content === null) {
          const ts = new Date(event.created_at).getTime();
          if (Number.isFinite(ts)) {
            const from = new Date(ts - 20 * 60 * 1000).toISOString();
            const to = new Date(ts + 20 * 60 * 1000).toISOString();
            try {
              const nearby = await loadReadings(bowlDevice.id, null, 300, {
                from,
                to,
              });
              let bestDelta = Number.POSITIVE_INFINITY;
              for (const reading of nearby.data) {
                const rts = new Date(reading.recorded_at).getTime();
                if (!Number.isFinite(rts)) continue;
                const delta = Math.abs(rts - ts);
                if (delta >= bestDelta) continue;
                const value = selectBowlSeriesValue(reading);
                if (value === null) continue;
                bestDelta = delta;
                content = value;
              }
            } catch {
              // keep unresolved for this event
            }
          }
        }
        if (content !== null && content > maxValue) {
          maxValue = content;
        }
      }

      if (!active || maxValue <= 0) return;
      setBowlStoredMaxTerminoServido(maxValue);
      if (typeof window !== "undefined") {
        const key = `${BAR_MAX_TERMINO_SERVIDO_KEY_PREFIX}${bowlDevice.id}`;
        window.localStorage.setItem(key, String(maxValue));
      }
    };

    void resolveMaxFromTerminoEvents();
    return () => {
      active = false;
    };
  }, [
    bowlDevice?.id,
    bowlMaxServedContentGrams,
    bowlReferenceReadings,
    bowlStoredMaxTerminoServido,
    deviceAuditEvents,
    loadReadings,
    selectBowlSeriesValue,
  ]);

  useEffect(() => {
    if (
      !bowlDevice?.id ||
      bowlMaxServedContentGrams === null ||
      bowlMaxServedContentGrams <= 0
    ) {
      return;
    }
    setBowlStoredMaxTerminoServido((prev) => {
      const next =
        prev !== null
          ? Math.max(prev, bowlMaxServedContentGrams)
          : bowlMaxServedContentGrams;
      if (typeof window !== "undefined") {
        const key = `${BAR_MAX_TERMINO_SERVIDO_KEY_PREFIX}${bowlDevice.id}`;
        window.localStorage.setItem(key, String(next));
      }
      return next;
    });
  }, [bowlDevice?.id, bowlMaxServedContentGrams]);

  const waterMaxServedContentMl = useMemo(() => {
    const events = deviceAuditEvents[waterDevice?.id ?? ""] ?? [];
    const values = events
      .filter((event) => event.category === "termino_servido")
      .map((event) =>
        getEventContentWeightWithFallback(
          event,
          waterReferenceReadings,
          selectWaterSeriesValue,
        ),
      )
      .filter((value): value is number => value !== null && value > 0);
    if (!values.length) return null;
    return Math.max(...values);
  }, [
    deviceAuditEvents,
    selectWaterSeriesValue,
    waterDevice?.id,
    waterReferenceReadings,
  ]);

  const waterBlockLevelPct = useMemo(() => {
    if (waterContentWeightGrams === null || waterMaxServedContentMl === null) {
      return null;
    }
    if (waterMaxServedContentMl <= 0) return null;
    return Math.min(
      1,
      Math.max(0, waterContentWeightGrams / waterMaxServedContentMl),
    );
  }, [waterContentWeightGrams, waterMaxServedContentMl]);

  // Hunger Bar — reemplaza el medidor de combustible del plato en esta card:
  // detección automática sobre `readings` en vez de audit_events manuales.
  // Ver Knowledge/05_API/SPEC_HungerBar_Alimentacion.md.
  const hungerFilledBlocks = useMemo(() => {
    if (!hungerBar || hungerBar.percentage === null) return 0;
    return Math.max(
      0,
      Math.min(
        WELLNESS_BLOCKS,
        Math.round((hungerBar.percentage / 100) * WELLNESS_BLOCKS),
      ),
    );
  }, [hungerBar]);

  const hungerStatusLabel = useMemo(() => {
    if (
      !hungerBar ||
      hungerBar.status !== "ok" ||
      hungerBar.percentage === null
    ) {
      return "Sin evidencia real";
    }
    if (hungerBar.alertActive) return "Atrasada";
    if (hungerBar.usingFallback) return "Aprendiendo hábitos";
    return "Confirmado";
  }, [hungerBar]);

  const hungerValueLabel = useMemo(() => {
    if (!hungerBar || hungerBar.percentage === null) return "N/D";
    return `${hungerBar.percentage}%`;
  }, [hungerBar]);

  // v1.1 — gradiente continuo en vez del degradé fijo ámbar→rosa
  const hungerFillColor = useMemo(() => {
    if (!hungerBar || hungerBar.percentage === null) return null;
    return hungerBarColor(hungerBar.percentage);
  }, [hungerBar]);

  const hungerNoteLabel = useMemo(() => {
    if (
      !hungerBar ||
      hungerBar.status !== "ok" ||
      hungerBar.percentage === null
    ) {
      return "Última comida confirmada: sin registro";
    }
    if (hungerBar.alertActive) {
      return `Sin comer hace más de ${Math.floor(hungerBar.hoursOverdue ?? 0)} h`;
    }
    if (hungerBar.percentage <= 0) return "Debería haber comido ya";
    return hungerBar.estimatedNextMealAt
      ? `Próxima comida estimada: ${formatTimestamp(hungerBar.estimatedNextMealAt)}`
      : "Última comida confirmada: sin registro";
  }, [hungerBar]);

  const waterFilledBlocks = useMemo(() => {
    if (waterBlockLevelPct === null) return 0;
    return Math.max(
      0,
      Math.min(
        WELLNESS_BLOCKS,
        Math.round(waterBlockLevelPct * WELLNESS_BLOCKS),
      ),
    );
  }, [waterBlockLevelPct]);

  const getConnectivityLabel = (timestamp?: string | null) => {
    if (!timestamp) return "Sin señal";
    const diffMinutes = Math.round(
      Math.max(0, Date.now() - new Date(timestamp).getTime()) / 60000,
    );
    if (!Number.isFinite(diffMinutes)) return "Sin señal";
    if (diffMinutes <= 10) return "Estable";
    if (diffMinutes <= 45) return "Reciente";
    if (diffMinutes <= 180) return "Atrasada";
    return "Sin señal";
  };

  const getBatteryStateLabel = (
    state: string | null | undefined,
    level: number | null | undefined,
  ): { text: string; className: string } => {
    if (state === "charging")
      return { text: "Cargando", className: "text-emerald-600 font-medium" };
    if (state === "charged")
      return { text: "Cargado", className: "text-emerald-500 font-medium" };
    if (state === "battery_only" && level != null)
      return {
        text: `Batería ${Math.round(level)}%`,
        className: "text-slate-500",
      };
    if (level != null)
      return { text: `${Math.round(level)}%`, className: "text-slate-500" };
    return { text: "N/D", className: "text-slate-400" };
  };

  const getOperationalLabel = (powerState: "on" | "off" | "nodata") => {
    if (powerState === "on") return "Dispositivo encendido";
    if (powerState === "off") return "Dispositivo apagado";
    return "Sin telemetría";
  };

  const getWellnessToneClasses = (
    stateLabel: string,
    type: "food" | "water",
  ) => {
    if (stateLabel === "Confirmado") {
      return type === "food"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-sky-200 bg-sky-50 text-sky-800";
    }
    if (stateLabel === "Sin evidencia real") {
      return "border-slate-200 bg-slate-50 text-slate-600";
    }
    return "border-slate-200 bg-slate-50 text-slate-600";
  };
  // Mientras no se resuelve el account type no renderizar nada (evita flicker)
  if (accountType === null) {
    return null;
  }

  if (accountType === "admin") {
    return null;
  }

  return (
    <div className="min-h-screen px-4 pb-10 pt-4 md:px-6 md:pt-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        {accountType === "client" &&
          (() => {
            const hasPet = state.pets.length > 0;
            const hasDevice = state.devices.some((d) => d.pet_id != null);
            const steps = [
              !hasPet && {
                href: "/registro",
                label: "Agrega tu mascota",
                desc: "Ve a Registrar para crear el perfil de tu gato.",
              },
              hasPet &&
                !hasDevice && {
                  href: "/bowl",
                  label: "Vincula un plato",
                  desc: "En la pestaña Plato puedes conectar tu dispensador.",
                },
            ].filter(Boolean) as {
              href: string;
              label: string;
              desc: string;
            }[];
            if (steps.length === 0) return null;
            return (
              <div className="surface-card freeform-rise flex flex-col gap-3 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-50">
                  Completa tu configuración
                </p>
                {steps.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    className="flex items-start gap-3 rounded-lg border border-dashed border-current/20 px-4 py-3 hover:bg-white/5"
                  >
                    <span className="mt-0.5 text-base">→</span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">{s.label}</span>
                      <span className="text-xs opacity-60">{s.desc}</span>
                    </span>
                  </a>
                ))}
              </div>
            );
          })()}
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
                    unoptimized
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
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
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
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                  <p className="truncate text-xs text-slate-500 md:text-sm">
                    {petMeta.length
                      ? petMeta.join(" · ")
                      : "Sin datos de registro"}
                  </p>
                </div>
              </div>

              <aside className="today-hero-aside ml-auto flex w-full flex-col items-stretch gap-1 sm:w-auto sm:min-w-[260px]">
                <p className="today-hero-updated text-[9px] uppercase tracking-[0.12em] text-slate-400/75">
                  Actualizado el {heroUpdatedLabel}
                </p>
                <div className="w-full rounded-[18px] border border-white/80 bg-white/80 p-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] backdrop-blur-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Barras Sims
                    </p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {bowlDevice?.device_id ?? "KPCLXXXX"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        key: "food",
                        title: "Comida",
                        iconSrc: "/illustrations/icono_comida.png",
                        filledBlocks: hungerFilledBlocks,
                        valueLabel: hungerValueLabel,
                        statusLabel: hungerStatusLabel,
                        noteLabel: hungerNoteLabel,
                        trackClass: hungerBar?.alertActive
                          ? "border-2 border-rose-500 bg-rose-50 animate-pulse"
                          : "border-rose-100 bg-rose-50",
                        fillClass: "",
                        fillStyle: hungerFillColor
                          ? { backgroundColor: hungerFillColor }
                          : undefined,
                        labelClass: "text-rose-700",
                        badgeClass: hungerBar?.alertActive
                          ? "border-rose-300 bg-rose-100 text-rose-800"
                          : "border-rose-100 bg-rose-50 text-rose-700",
                      },
                      {
                        key: "water",
                        title: "Agua",
                        iconSrc: "/illustrations/icono_agua.png",
                        filledBlocks: waterFilledBlocks,
                        valueLabel:
                          waterContentWeightGrams !== null
                            ? `${Math.round(waterContentWeightGrams)} mL`
                            : "N/D",
                        statusLabel: waterWellness.stateLabel,
                        noteLabel: waterWellness.lastEventLabel,
                        trackClass: "border-emerald-100 bg-emerald-50",
                        fillClass:
                          "bg-[linear-gradient(180deg,rgba(45,212,191,0.95)_0%,rgba(16,185,129,0.95)_100%)]",
                        fillStyle: undefined as
                          | { backgroundColor: string }
                          | undefined,
                        labelClass: "text-emerald-700",
                        badgeClass:
                          "border-slate-200 bg-slate-50 text-slate-500",
                      },
                    ].map(
                      ({
                        key,
                        title,
                        iconSrc,
                        filledBlocks,
                        valueLabel,
                        statusLabel,
                        noteLabel,
                        trackClass,
                        fillClass,
                        fillStyle,
                        labelClass,
                        badgeClass,
                      }) => (
                        <div
                          key={key}
                          className={`flex flex-col items-center gap-2 rounded-[16px] border bg-white px-3 py-3 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.25)] ${trackClass}`}
                        >
                          <div className="flex h-8 items-center justify-center">
                            <Image
                              src={iconSrc}
                              alt=""
                              aria-hidden={true}
                              width={32}
                              height={32}
                              className="h-8 w-8 object-contain opacity-90"
                            />
                          </div>
                          <div className="relative flex h-36 w-10 items-end rounded-[999px] border border-slate-100 p-1 shadow-inner shadow-white/50">
                            <div
                              className={`w-full rounded-[999px] transition-[height] duration-500 ease-out ${fillClass}`}
                              style={{
                                height: `${Math.round((filledBlocks / WELLNESS_BLOCKS) * 100)}%`,
                                ...fillStyle,
                              }}
                            />
                          </div>
                          <div className="flex flex-col items-center gap-0.5 text-center">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                            >
                              {statusLabel}
                            </span>
                            <p
                              className={`text-[11px] font-semibold ${labelClass}`}
                            >
                              {title} · {valueLabel}
                            </p>
                            <p className="text-[10px] leading-tight text-slate-400">
                              {noteLabel}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-400">
                    <span>{getOperationalLabel(bowlPowerState)}</span>
                    <span>
                      {
                        getBatteryStateLabel(
                          bowlDevice?.battery_state,
                          bowlDevice?.battery_level,
                        ).text
                      }
                    </span>
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
              <div className="flex flex-col gap-2">
                {!hasFoodDevice ? (
                  <article className="today-bowl-card flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-emerald-200 bg-emerald-50/30 p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Alimentación
                    </p>
                    <Image
                      src="/illustrations/pink_food_full.png"
                      alt="Sin comedero"
                      width={96}
                      height={70}
                      className="h-16 w-auto object-contain opacity-40"
                    />
                    <p className="text-center text-sm text-slate-400">
                      Sin comedero asignado
                    </p>
                    <Link
                      href="/bowl"
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Agregar comedero
                    </Link>
                  </article>
                ) : (
                  <>
                    <article className="today-bowl-card rounded-[var(--radius)] border border-emerald-100 bg-white p-4 shadow-sm transition-transform duration-200 ease-out hover:scale-[1.01] md:p-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                              Alimentación
                            </p>
                            <span
                              className={`inline-block h-2 w-2 rounded-full border ${powerDotStyles[bowlPowerState]}`}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-slate-500">
                            <span>
                              {getConnectivityLabel(
                                bowlLatestReading?.recorded_at ??
                                  bowlDevice?.last_seen ??
                                  null,
                              )}
                            </span>
                            <span aria-hidden="true">·</span>
                            <BatteryStatusIcon
                              level={bowlDevice?.battery_level ?? null}
                              charging={
                                bowlDevice?.battery_state === "charging"
                              }
                              charged={bowlDevice?.battery_state === "charged"}
                              className="h-3.5 w-3.5 text-slate-400"
                            />
                            {(() => {
                              const s = getBatteryStateLabel(
                                bowlDevice?.battery_state,
                                bowlDevice?.battery_level,
                              );
                              return (
                                <span className={s.className}>{s.text}</span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getWellnessToneClasses(
                              bowlWellness.stateLabel,
                              "food",
                            )}`}
                          >
                            {bowlWellness.stateLabel}
                          </span>
                          <p className="text-sm text-slate-500">
                            {bowlWellness.lastEventLabel}
                          </p>
                        </div>

                        <div className="grid items-center gap-3">
                          <div className="flex flex-col items-center py-1">
                            <Image
                              src="/illustrations/pink_food_full.png"
                              alt="Kittypau comedero"
                              width={224}
                              height={164}
                              className="mx-auto h-48 w-auto object-contain object-center"
                            />
                            {bowlWellness.levelLabel !== "Sin confirmación" ? (
                              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                                {bowlWellness.levelLabel}
                              </p>
                            ) : null}
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                              {bowlDevice?.device_id ?? "KPCLXXXX"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <span
                            className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                            title="Contenido actual"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18M3 12h18M3 18h18" />
                            </svg>
                            {bowlContentWeightText}
                            {renderTrend(
                              bowlContentWeightGrams,
                              bowlPrevContentWeightGrams,
                            )}
                          </span>
                          <span
                            className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-600"
                            title="Temperatura"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                            </svg>
                            {bowlTempText}
                          </span>
                          <span
                            className="flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-600"
                            title="Humedad"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                            </svg>
                            {bowlHumidityText}
                          </span>
                          <span
                            className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500"
                            title="Última lectura"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {formatTimestamp(
                              bowlLatestReading?.recorded_at ?? null,
                            )}
                          </span>
                        </div>
                      </div>
                    </article>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {!hasWaterDevice ? (
                  <article className="today-bowl-card flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-sky-200 bg-sky-50/30 p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Hidratación
                    </p>
                    <Image
                      src="/illustrations/green_water_full.png"
                      alt="Sin bebedero"
                      width={96}
                      height={70}
                      className="h-16 w-auto object-contain opacity-40"
                    />
                    <p className="text-center text-sm text-slate-400">
                      Sin bebedero asignado
                    </p>
                    <Link
                      href="/bowl"
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Agregar bebedero
                    </Link>
                  </article>
                ) : (
                  <>
                    <article className="today-bowl-card rounded-[var(--radius)] border border-sky-100 bg-white p-4 shadow-sm transition-transform duration-200 ease-out hover:scale-[1.01] md:p-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                              Hidratación
                            </p>
                            <span
                              className={`inline-block h-2 w-2 rounded-full border ${powerDotStyles[waterPowerState]}`}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-slate-500">
                            <span>
                              {getConnectivityLabel(
                                waterLatestReading?.recorded_at ??
                                  waterDevice?.last_seen ??
                                  null,
                              )}
                            </span>
                            <span aria-hidden="true">·</span>
                            <BatteryStatusIcon
                              level={waterDevice?.battery_level ?? null}
                              charging={
                                waterDevice?.battery_state === "charging"
                              }
                              charged={waterDevice?.battery_state === "charged"}
                              className="h-3.5 w-3.5 text-slate-400"
                            />
                            {(() => {
                              const s = getBatteryStateLabel(
                                waterDevice?.battery_state,
                                waterDevice?.battery_level,
                              );
                              return (
                                <span className={s.className}>{s.text}</span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getWellnessToneClasses(
                              waterWellness.stateLabel,
                              "water",
                            )}`}
                          >
                            {waterWellness.stateLabel}
                          </span>
                          <p className="text-sm text-slate-500">
                            {waterWellness.lastEventLabel}
                          </p>
                        </div>

                        <div className="grid items-center gap-3">
                          <div className="flex flex-col items-center py-1">
                            <Image
                              src="/illustrations/green_water_full.png"
                              alt="Kittypau bebedero"
                              width={224}
                              height={164}
                              className="mx-auto h-48 w-auto object-contain object-center"
                            />
                            {waterWellness.levelLabel !== "Sin confirmación" ? (
                              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                                {waterWellness.levelLabel}
                              </p>
                            ) : null}
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                              {waterDevice?.device_id ?? "KPCLXXXX"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <span
                            className="flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700"
                            title="Nivel actual"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                            </svg>
                            {waterVolumeMlText}
                            {renderTrend(
                              waterContentWeightGrams,
                              waterPrevContentWeightGrams,
                            )}
                          </span>
                          <span
                            className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-600"
                            title="Temperatura"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                            </svg>
                            {waterTempText}
                          </span>
                          <span
                            className="flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-600"
                            title="Humedad"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                            </svg>
                            {waterHumidityText}
                          </span>
                          <span
                            className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500"
                            title="Última lectura"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {formatTimestamp(
                              waterLatestReading?.recorded_at ?? null,
                            )}
                          </span>
                        </div>
                      </div>
                    </article>
                  </>
                )}
              </div>
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
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
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
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
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
              {mqttLiveError ? (
                <p className="mt-2 w-full text-center text-xs font-medium text-amber-700">
                  {mqttLiveError}
                </p>
              ) : null}
              {!isAuthoritativeFoodDevice ? (
                <p className="mt-2 w-full text-center text-xs font-medium text-amber-700">
                  Alimentación sin evidencia auditada: solo se confirma comida
                  desde {AUTHORITATIVE_FOOD_DEVICE_CODE} con categorías
                  inicio/termino.
                </p>
              ) : null}
            </div>
          </section>
        </header>

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
                  void signOutSession().finally(() => {
                    window.location.href = "/login";
                  });
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
