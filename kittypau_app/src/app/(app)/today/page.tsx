"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { getValidAccessToken, signOutSession } from "@/lib/auth/token";
import { authFetch } from "@/lib/auth/auth-fetch";
import { useMqttLive } from "@/lib/hooks/useMqttLive";
import OperationalActionsCard from "@/app/_components/operational-actions-card";
import {
  syncSelectedDevice,
  syncSelectedPet,
} from "@/lib/runtime/selection-sync";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import { type ChartData, type ChartOptions, type Plugin } from "chart.js";
import { Line } from "react-chartjs-2";
import { buildSeries } from "@/lib/charts";
import {
  getChileDayNightWindow,
  chileCompactDatetime,
  chileShortTime,
  chileLongDate,
  CHILE_TZ,
  CHILE_LOCALE,
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

type AuditEvent = {
  id: string;
  created_at: string;
  category: string;
  category_label: string;
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

type BowlCategoryChoice = {
  key: string;
  label: string;
};

const BOWL_CATEGORY_CHOICES: BowlCategoryChoice[] = [
  { key: "kpcl_sin_plato", label: "KPCL SIN PLATO" },
  { key: "kpcl_con_plato", label: "KPCL CON PLATO" },
  { key: "tare_con_plato", label: "TARE CON PLATO" },
  { key: "inicio_servido", label: "INICIO SERVIDO" },
  { key: "termino_servido", label: "TERMINO SERVIDO" },
  { key: "inicio_alimentacion", label: "INICIO ALIMENTACION" },
  { key: "termino_alimentacion", label: "TERMINO ALIMENTACION" },
];
const WATER_CATEGORY_CHOICES: BowlCategoryChoice[] = [
  { key: "kpcl_sin_plato", label: "KPCL SIN PLATO" },
  { key: "kpcl_con_plato", label: "KPCL CON PLATO" },
  { key: "tare_con_plato", label: "TARE CON PLATO" },
  { key: "inicio_servido", label: "INICIO SERVIDO" },
  { key: "termino_servido", label: "TERMINO SERVIDO" },
  { key: "inicio_hidratacion", label: "INICIO HIDRATACION" },
  { key: "termino_hidratacion", label: "TERMINO HIDRATACION" },
];

type PetAnalyticsSession = {
  id: string;
  device_id: string;
  session_type: string;
  session_start: string;
  session_end: string;
  duration_sec: number | null;
  grams_consumed: number | null;
  water_ml: number | null;
};

type SessionDetailStats = {
  events: number;
  avgConsumed: number | null;
  avgDurationMinutes: number | null;
};

type WellnessState = {
  stateLabel: string;
  actionLabel: string;
  levelLabel: string;
  lastEventLabel: string;
  hasEvidence: boolean;
};

type D3MarkerType = "food" | "water";
type D3MarkerPhase = "start" | "end";

type D3Marker = {
  id: string;
  type: D3MarkerType;
  phase: D3MarkerPhase;
  renderT: number;
  renderValue: number;
  startT: number;
  startValue: number;
  endT: number;
  endValue: number;
  avgValue: number;
  consumed: number;
  durationMinutes: number;
  confirmed: boolean;
  unit: "g" | "mL";
  icon: string;
  size: number;
};

type D3LineSegment = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
};

type D3AnomalyState = "normal" | "off_schedule" | "pending" | "no_evidence";

type MultiDayRow = {
  key: string;
  label: string;
  startMs: number;
  foodPoints: DayNightPoint[];
  waterPoints: DayNightPoint[];
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

function parseListResponse<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T[] }).data ?? [];
  }
  return [];
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

function summarizeAnalyticsSessionsByPeriods(
  sessions: PetAnalyticsSession[],
  valueKey: "grams_consumed" | "water_ml",
  nowMs: number,
): ConsumptionSummary {
  const boundaries = {
    day: nowMs - 24 * 60 * 60 * 1000,
    week: nowMs - 7 * 24 * 60 * 60 * 1000,
    month: nowMs - 30 * 24 * 60 * 60 * 1000,
  };
  const build = (startMs: number): PeriodStats => {
    const filtered = sessions.filter((s) => {
      const endT = new Date(s.session_end).getTime();
      return !Number.isNaN(endT) && endT >= startMs;
    });
    if (!filtered.length) return { consumed: null, cycles: 0 };
    const consumed = filtered.reduce((acc, s) => {
      const v = s[valueKey];
      return acc + Math.max(0, typeof v === "number" ? v : 0);
    }, 0);
    return { consumed: Math.round(consumed), cycles: filtered.length };
  };
  return {
    day: build(boundaries.day),
    week: build(boundaries.week),
    month: build(boundaries.month),
  };
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
const AUTHORITATIVE_FOOD_DEVICE_CODE = "KPCL0034";
const FOOD_START_CATEGORY = "inicio_alimentacion";
const FOOD_END_CATEGORY = "termino_alimentacion";
const WATER_START_CATEGORY = "inicio_hidratacion";
const WATER_END_CATEGORY = "termino_hidratacion";

function isAuthoritativeFoodDeviceCode(value?: string | null): boolean {
  return (value ?? "").toUpperCase() === AUTHORITATIVE_FOOD_DEVICE_CODE;
}

function toCycleHourOffset(ts: number, cycleStartMs: number): number {
  return (ts - cycleStartMs) / (60 * 60 * 1000);
}

function getCycleStartAtSix(ts: number): number {
  const date = new Date(ts);
  const cycleStart = new Date(date);
  cycleStart.setHours(6, 0, 0, 0);
  if (date.getTime() < cycleStart.getTime()) {
    cycleStart.setDate(cycleStart.getDate() - 1);
  }
  return cycleStart.getTime();
}

function toCycleHourOffsetByTimestamp(ts: number): number {
  return (ts - getCycleStartAtSix(ts)) / (60 * 60 * 1000);
}

type KpclD3EventKey =
  | "inicio_servido"
  | "termino_servido"
  | "inicio_alimentacion"
  | "termino_alimentacion"
  | "inicio_hidratacion"
  | "termino_hidratacion";

type KpclD3ChartObject = {
  library: "d3";
  timezone: string;
  cycle: {
    startHour: number;
    durationHours: number;
    navigation: ["prev", "today", "next"];
  };
  data: {
    readingsEndpoint: string;
    eventsEndpointTemplate: string;
    readingFields: ["recorded_at", "weight_grams", "water_ml", "battery_level"];
    eventCategories: KpclD3EventKey[];
    useOnlyRealData: true;
  };
  pipeline: {
    prioritizeAuditEvents: true;
    foodEvidence: {
      authoritativeDeviceCode: string;
      requiredCategories: ["inicio_alimentacion", "termino_alimentacion"];
      allowHeuristicInference: false;
    };
    hydrationHeuristicFallback: {
      minDropGrams: number;
      maxGapMinutes: number;
    };
  };
  visuals: {
    assets: {
      fondo: string;
      foodIcon: string;
      waterIcon: string;
    };
    colors: {
      food: string;
      water: string;
      line: string;
      servedStart: string;
      servedEnd: string;
      foodStart: string;
      foodEnd: string;
    };
    iconSizingByConsumption: {
      min: number;
      max: number;
    };
  };
  comparison: {
    days: number;
    sharedXDomain: boolean;
    stacked: boolean;
  };
};

const KPCL_D3_CHART_OBJECT: KpclD3ChartObject = {
  library: "d3",
  timezone: CHILE_TZ,
  cycle: {
    startHour: 6,
    durationHours: 24,
    navigation: ["prev", "today", "next"],
  },
  data: {
    readingsEndpoint: "/api/readings",
    eventsEndpointTemplate: "/api/devices/:deviceId/events",
    readingFields: ["recorded_at", "weight_grams", "water_ml", "battery_level"],
    eventCategories: [
      "inicio_servido",
      "termino_servido",
      "inicio_alimentacion",
      "termino_alimentacion",
      "inicio_hidratacion",
      "termino_hidratacion",
    ],
    useOnlyRealData: true,
  },
  pipeline: {
    prioritizeAuditEvents: true,
    foodEvidence: {
      authoritativeDeviceCode: AUTHORITATIVE_FOOD_DEVICE_CODE,
      requiredCategories: [FOOD_START_CATEGORY, FOOD_END_CATEGORY],
      allowHeuristicInference: false,
    },
    hydrationHeuristicFallback: {
      minDropGrams: 2,
      maxGapMinutes: 180,
    },
  },
  visuals: {
    assets: {
      fondo: "/fondo.png",
      foodIcon: "/illustrations/pink_food_full.png",
      waterIcon: "/illustrations/green_water_full.png",
    },
    colors: {
      food: "#ec4899",
      water: "#14b8a6",
      line: "#64748b",
      servedStart: "#22c55e",
      servedEnd: "#ef4444",
      foodStart: "#3b82f6",
      foodEnd: "#f97316",
    },
    iconSizingByConsumption: {
      min: 16,
      max: 42,
    },
  },
  comparison: {
    days: 4,
    sharedXDomain: true,
    stacked: true,
  },
};

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
  const [analyticsHistorySessions, setAnalyticsHistorySessions] = useState<
    PetAnalyticsSession[]
  >([]);
  const [chartLoadError, setChartLoadError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [bowlCategoryBusy, setBowlCategoryBusy] = useState<string | null>(null);
  const [bowlCategoryFeedback, setBowlCategoryFeedback] = useState<
    string | null
  >(null);
  const [bowlPlateOverrides, setBowlPlateOverrides] = useState<
    Record<string, number>
  >({});
  const [bowlLastEmptyWeight, setBowlLastEmptyWeight] = useState<
    Record<string, number>
  >({});
  const [bowlTareOffsets, setBowlTareOffsets] = useState<
    Record<string, number>
  >({});
  const [bowlPendingPlateConfirm, setBowlPendingPlateConfirm] = useState<
    Record<string, boolean>
  >({});
  const [waterCategoryBusy, setWaterCategoryBusy] = useState<string | null>(
    null,
  );
  const [waterCategoryFeedback, setWaterCategoryFeedback] = useState<
    string | null
  >(null);
  const [waterPlateOverrides, setWaterPlateOverrides] = useState<
    Record<string, number>
  >({});
  const [waterLastEmptyWeight, setWaterLastEmptyWeight] = useState<
    Record<string, number>
  >({});
  const [waterTareOffsets, setWaterTareOffsets] = useState<
    Record<string, number>
  >({});
  const [waterPendingPlateConfirm, setWaterPendingPlateConfirm] = useState<
    Record<string, boolean>
  >({});
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [accountType, setAccountType] = useState<
    "admin" | "tester" | "client" | null
  >(null);
  const [consumptionPeriod, setConsumptionPeriod] =
    useState<ConsumptionViewPeriod>("day");
  const [dayCycleOffsetDays, setDayCycleOffsetDays] = useState(0);
  const [deviceAuditEvents, setDeviceAuditEvents] = useState<
    Record<string, AuditEvent[]>
  >({});
  const [d3HoverMarker, setD3HoverMarker] = useState<{
    marker: D3Marker;
    anchorX: number;
    anchorY: number;
  } | null>(null);
  const [d3CursorTs, setD3CursorTs] = useState<number | null>(null);

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
  }, [isAuthed, loadReadings]);

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
    const onPetChange = async (event: Event) => {
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
    const onDeviceChange = async (event: Event) => {
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
      "kittypau-pet-change",
      onPetChange as EventListener,
    );
    window.addEventListener(
      "kittypau-device-change",
      onDeviceChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "kittypau-pet-change",
        onPetChange as EventListener,
      );
      window.removeEventListener(
        "kittypau-device-change",
        onDeviceChange as EventListener,
      );
    };
  }, [
    selectedDeviceId,
    selectedPetId,
    state.devices,
    state.pets,
    loadReadings,
  ]);

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
  const baseWaterDevice =
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
  const waterDevice =
    baseWaterDevice ??
    (bowlDevice
      ? (petDevices.find((device) => device.id !== bowlDevice.id) ?? null)
      : null);
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
      if (!active) {
        inFlight = false;
        return;
      }
      setDeviceLatestReadings((prev) => ({
        ...prev,
        ...Object.fromEntries(
          entries.map(([deviceId, latest]) => [deviceId, latest]),
        ),
      }));
      setDevicePreviousReadings((prev) => ({
        ...prev,
        ...Object.fromEntries(
          entries.map(([deviceId, , previous]) => [deviceId, previous]),
        ),
      }));
      setLastRefreshAt(new Date().toISOString());
      inFlight = false;
    };
    void loadTargets();
    interval = window.setInterval(loadTargets, 5000);
    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
    };
  }, [bowlDevice?.id, waterDevice?.id, loadReadings]);

  useEffect(() => {
    if (!bowlDevice?.id) return;
    let active = true;
    const load3Days = async () => {
      const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      try {
        // Usar endpoint bucketed (bucket 15 min → 288 pts para 3 días)
        // para evitar el límite de 5000 rows crudas
        const params = new URLSearchParams({
          device_id: bowlDevice.id,
          from,
          bucket_s: "900",
        });
        const res = await authFetch(
          `/api/readings/bucketed?${params.toString()}`,
        );
        if (!active) return;
        if (res.ok) {
          const payload = (await res.json()) as { data?: ApiReading[] };
          setBowlLongReadings(payload.data ?? []);
        }
      } catch {
        // keep empty — chart shows "sin lecturas"
      }
    };
    void load3Days();
    return () => {
      active = false;
    };
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
            const result = await loadReadings(deviceId, null, 5000, {
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
      const lookbackDays = Math.max(30, dayCycleOffsetDays + 2);
      const from = new Date(
        Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const to = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const entries = await Promise.all(
        targetIds.map(async (deviceId) => {
          try {
            const res = await authFetch(
              `/api/devices/${deviceId}/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
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

  useEffect(() => {
    const petId = primaryPet?.id;
    if (!petId) return;
    let active = true;
    const loadAnalyticsSessions = async () => {
      const from = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const params = new URLSearchParams({ pet_id: petId, from, limit: "200" });
      try {
        const res = await authFetch(
          `/api/analytics/sessions?${params.toString()}`,
        );
        if (!res.ok) return;
        const payload = (await res.json()) as { data?: unknown[] };
        if (!active) return;
        setAnalyticsHistorySessions(
          (payload.data ?? []) as PetAnalyticsSession[],
        );
      } catch {
        // keep empty — fallback to raw readings summary
      }
    };
    void loadAnalyticsSessions();
    return () => {
      active = false;
    };
  }, [primaryPet?.id]);

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

  const hasAnalyticsHistory = analyticsHistorySessions.length > 0;

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
  const bowlPlateWeightText =
    bowlPlateWeightEffective !== null
      ? `${Math.round(Math.max(0, bowlPlateWeightEffective))} g`
      : "N/D";
  const bowlSensorWeightText =
    bowlGrossWeightGrams !== null
      ? `${Math.round(Math.max(0, bowlGrossWeightGrams))} g`
      : "N/D";
  const handleBowlCategory = useCallback(
    async (choice: BowlCategoryChoice) => {
      if (!bowlDevice?.id || bowlCategoryBusy) return;
      setBowlCategoryBusy(choice.key);
      setBowlCategoryFeedback(null);
      try {
        const res = await authFetch(`/api/devices/${bowlDevice.id}/category`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: choice.key,
            snapshot: {
              device_id: bowlDevice.device_id,
              weight_grams: bowlGrossWeightGrams,
              plate_weight_grams: bowlPlateWeightEffective,
              content_weight_grams: bowlContentWeightGrams,
              sensor_recorded_at: bowlLatestReading?.recorded_at ?? null,
            },
          }),
        });
        if (!res.ok) throw new Error("category-save-failed");
        setBowlCategoryFeedback(`Guardado: ${choice.label}`);
        if (choice.key === "kpcl_sin_plato") {
          if (bowlGrossWeightGrams !== null) {
            setBowlLastEmptyWeight((prev) => ({
              ...prev,
              [bowlDevice.id]: bowlGrossWeightGrams,
            }));
          }
          setBowlPlateOverrides((prev) => ({
            ...prev,
            [bowlDevice.id]: 0,
          }));
          setBowlPendingPlateConfirm((prev) => ({
            ...prev,
            [bowlDevice.id]: true,
          }));
        }
        if (choice.key === "kpcl_con_plato") {
          const emptyWeight =
            bowlDevice.id in bowlLastEmptyWeight
              ? bowlLastEmptyWeight[bowlDevice.id]
              : null;
          if (emptyWeight !== null && bowlGrossWeightGrams !== null) {
            const plateWeight = Math.max(0, bowlGrossWeightGrams - emptyWeight);
            setBowlPlateOverrides((prev) => ({
              ...prev,
              [bowlDevice.id]: plateWeight,
            }));
          }
          setBowlPendingPlateConfirm((prev) => ({
            ...prev,
            [bowlDevice.id]: false,
          }));
        }
        if (choice.key === "tare_con_plato") {
          const tareBase =
            bowlRawContentWeightGrams !== null ? bowlRawContentWeightGrams : 0;
          setBowlTareOffsets((prev) => ({
            ...prev,
            [bowlDevice.id]: tareBase,
          }));
        }
      } catch {
        setBowlCategoryFeedback("No se pudo guardar la categoría.");
      } finally {
        setBowlCategoryBusy(null);
        window.setTimeout(() => setBowlCategoryFeedback(null), 3000);
      }
    },
    [
      bowlCategoryBusy,
      bowlContentWeightGrams,
      bowlLastEmptyWeight,
      bowlDevice?.device_id,
      bowlDevice?.id,
      bowlGrossWeightGrams,
      bowlLatestReading?.recorded_at,
      bowlPlateWeightGrams,
      bowlPlateWeightEffective,
      bowlRawContentWeightGrams,
      bowlPendingPlateConfirm,
    ],
  );
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
  const waterPlateWeightText =
    waterPlateWeightEffective !== null
      ? `${Math.round(Math.max(0, waterPlateWeightEffective))} g`
      : "N/D";
  const waterSensorWeightText =
    waterGrossWeightGrams !== null
      ? `${Math.round(Math.max(0, waterGrossWeightGrams))} g`
      : "N/D";
  const waterVolumeMlText =
    waterContentWeightGrams !== null
      ? `${Math.round(waterContentWeightGrams)} mL`
      : "N/D";
  const handleWaterCategory = useCallback(
    async (choice: BowlCategoryChoice) => {
      if (!waterDevice?.id || waterCategoryBusy) return;
      setWaterCategoryBusy(choice.key);
      setWaterCategoryFeedback(null);
      try {
        const res = await authFetch(`/api/devices/${waterDevice.id}/category`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: choice.key,
            snapshot: {
              device_id: waterDevice.device_id,
              weight_grams: waterGrossWeightGrams,
              plate_weight_grams: waterPlateWeightEffective,
              content_weight_grams: waterContentWeightGrams,
              sensor_recorded_at: waterLatestReading?.recorded_at ?? null,
            },
          }),
        });
        if (!res.ok) throw new Error("category-save-failed");
        setWaterCategoryFeedback(`Guardado: ${choice.label}`);
        if (choice.key === "kpcl_sin_plato") {
          if (waterGrossWeightGrams !== null) {
            setWaterLastEmptyWeight((prev) => ({
              ...prev,
              [waterDevice.id]: waterGrossWeightGrams,
            }));
          }
          setWaterPlateOverrides((prev) => ({
            ...prev,
            [waterDevice.id]: 0,
          }));
          setWaterPendingPlateConfirm((prev) => ({
            ...prev,
            [waterDevice.id]: true,
          }));
        }
        if (choice.key === "kpcl_con_plato") {
          const emptyWeight =
            waterDevice.id in waterLastEmptyWeight
              ? waterLastEmptyWeight[waterDevice.id]
              : null;
          if (emptyWeight !== null && waterGrossWeightGrams !== null) {
            const plateWeight = Math.max(
              0,
              waterGrossWeightGrams - emptyWeight,
            );
            setWaterPlateOverrides((prev) => ({
              ...prev,
              [waterDevice.id]: plateWeight,
            }));
          }
          setWaterPendingPlateConfirm((prev) => ({
            ...prev,
            [waterDevice.id]: false,
          }));
        }
        if (choice.key === "tare_con_plato") {
          const tareBase =
            waterRawContentWeightGrams !== null
              ? waterRawContentWeightGrams
              : 0;
          setWaterTareOffsets((prev) => ({
            ...prev,
            [waterDevice.id]: tareBase,
          }));
        }
      } catch {
        setWaterCategoryFeedback("No se pudo guardar la categoría.");
      } finally {
        setWaterCategoryBusy(null);
        window.setTimeout(() => setWaterCategoryFeedback(null), 3000);
      }
    },
    [
      waterCategoryBusy,
      waterContentWeightGrams,
      waterLastEmptyWeight,
      waterDevice?.device_id,
      waterDevice?.id,
      waterGrossWeightGrams,
      waterLatestReading?.recorded_at,
      waterPlateWeightGrams,
      waterPlateWeightEffective,
      waterRawContentWeightGrams,
      waterPendingPlateConfirm,
    ],
  );

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
  const bowlChartReadings = useMemo(
    () => (bowlDevice?.id ? (deviceChartReadings[bowlDevice.id] ?? []) : []),
    [bowlDevice?.id, deviceChartReadings],
  );
  const waterChartReadings = useMemo(
    () => (waterDevice?.id ? (deviceChartReadings[waterDevice.id] ?? []) : []),
    [waterDevice?.id, deviceChartReadings],
  );

  const todayWeightSeries = useMemo(
    () =>
      buildSeries(
        bowlLongReadings,
        (r) => {
          const gross = r.weight_grams;
          if (gross === null || gross === undefined) return null;
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
        THREE_DAYS_MS,
      ),
    [
      bowlLongReadings,
      bowlPlateWeightEffective,
      bowlDevice?.id,
      bowlTareOffsets,
    ],
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

  // Serie ordenada ascendente para el gráfico 3D — referenciada en tooltip callbacks
  const orderedToday3d = useMemo(
    () => todayWeightSeries.slice(0, 288).reverse(),
    [todayWeightSeries],
  );

  const formatToday3dTooltipTitle = (idx: number): string => {
    const ts = orderedToday3d[idx]?.timestamp;
    if (!ts) return "";
    const d = new Date(ts);
    const hh = d.getHours().toString().padStart(2, "0");
    const mi = d.getMinutes().toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const mo = (d.getMonth() + 1).toString().padStart(2, "0");
    const aa = d.getFullYear().toString().slice(2);
    return `${hh}:${mi}  ${dd}/${mo}/${aa}`;
  };

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

  const d3Canvas = {
    width: 1200,
    height: 380,
    marginTop: 24,
    marginRight: 28,
    marginBottom: 30,
    marginLeft: 28,
  } as const;
  const d3InnerWidth =
    d3Canvas.width - d3Canvas.marginLeft - d3Canvas.marginRight;
  const d3InnerHeight =
    d3Canvas.height - d3Canvas.marginTop - d3Canvas.marginBottom;
  const d3CycleStartMs = dayNightWindow.startMs;
  const d3CycleEndMs = dayNightWindow.endMs;
  const d3AllPoints = useMemo(
    () =>
      [...bowlDayNightPoints, ...waterDayNightPoints].sort((a, b) => a.t - b.t),
    [bowlDayNightPoints, waterDayNightPoints],
  );
  const d3YDomain = useMemo(() => {
    if (!d3AllPoints.length) return [0, 100] as const;
    const min = d3.min(d3AllPoints, (p) => p.y) ?? 0;
    const max = d3.max(d3AllPoints, (p) => p.y) ?? 100;
    const padding = Math.max(6, (max - min) * 0.12);
    return [Math.max(0, min - padding), max + padding] as const;
  }, [d3AllPoints]);
  const d3XScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([d3CycleStartMs, d3CycleEndMs])
        .range([d3Canvas.marginLeft, d3Canvas.marginLeft + d3InnerWidth]),
    [d3CycleEndMs, d3CycleStartMs, d3InnerWidth],
  );
  const d3YScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain(d3YDomain)
        .range([d3Canvas.marginTop + d3InnerHeight, d3Canvas.marginTop]),
    [d3InnerHeight, d3YDomain],
  );
  const buildD3Segments = useCallback(
    (points: DayNightPoint[], prefix: string): D3LineSegment[] => {
      if (points.length < 2) return [];
      const segments: D3LineSegment[] = [];
      for (let index = 1; index < points.length; index += 1) {
        const prev = points[index - 1];
        const curr = points[index];
        const dtHours = Math.max(0.0001, (curr.t - prev.t) / (60 * 60 * 1000));
        const velocity = Math.abs((curr.y - prev.y) / dtHours);
        const strokeWidth = Math.max(
          1.5,
          Math.min(5.4, 1.8 + velocity * 0.035),
        );
        segments.push({
          id: `${prefix}-${index}-${curr.t}`,
          x1: d3XScale(prev.t),
          y1: d3YScale(prev.y),
          x2: d3XScale(curr.t),
          y2: d3YScale(curr.y),
          strokeWidth,
        });
      }
      return segments;
    },
    [d3XScale, d3YScale],
  );
  const d3LinePathFood = useMemo(() => {
    if (bowlDayNightPoints.length < 2) return "";
    const line = d3
      .line<DayNightPoint>()
      .x((p) => d3XScale(p.t))
      .y((p) => d3YScale(p.y))
      .curve(d3.curveMonotoneX);
    return line(bowlDayNightPoints) ?? "";
  }, [bowlDayNightPoints, d3XScale, d3YScale]);
  const d3LinePathWater = useMemo(() => {
    if (waterDayNightPoints.length < 2) return "";
    const line = d3
      .line<DayNightPoint>()
      .x((p) => d3XScale(p.t))
      .y((p) => d3YScale(p.y))
      .curve(d3.curveMonotoneX);
    return line(waterDayNightPoints) ?? "";
  }, [d3XScale, d3YScale, waterDayNightPoints]);
  const d3FoodSegments = useMemo(
    () => buildD3Segments(bowlDayNightPoints, "food-seg"),
    [bowlDayNightPoints, buildD3Segments],
  );
  const d3WaterSegments = useMemo(
    () => buildD3Segments(waterDayNightPoints, "water-seg"),
    [buildD3Segments, waterDayNightPoints],
  );
  const d3NowTs = useMemo(() => {
    if (dayCycleOffsetDays !== 0) return null;
    const now = Date.now();
    if (now < d3CycleStartMs || now > d3CycleEndMs) return null;
    return now;
  }, [d3CycleEndMs, d3CycleStartMs, dayCycleOffsetDays]);
  const d3BackgroundBands = useMemo(
    () => [
      {
        key: "morning",
        label: "Mañana",
        from: 0,
        to: 6,
        color: "rgba(251,207,232,0.35)",
      },
      {
        key: "day",
        label: "Día",
        from: 6,
        to: 12,
        color: "rgba(236,253,245,0.35)",
      },
      {
        key: "afternoon",
        label: "Tarde",
        from: 12,
        to: 16,
        color: "rgba(224,242,254,0.35)",
      },
      {
        key: "night",
        label: "Noche",
        from: 16,
        to: 24,
        color: "rgba(15,23,42,0.25)",
      },
    ],
    [],
  );
  const d3SessionConnectors = useMemo(
    () =>
      bowlIntakeSessions.map((session, index) => ({
        id: `connector-${index}-${session.startT}`,
        startT: session.startT,
        endT: session.endT,
        yValue: (session.startValue + session.endValue) / 2,
      })),
    [bowlIntakeSessions],
  );
  const d3Markers = useMemo<D3Marker[]>(() => {
    const plateSize = 42;
    return bowlIntakeSessions
      .flatMap((session, index) => {
        const consumed = Math.max(0, Math.round(session.consumed));
        const common = {
          type: "food" as const,
          startT: session.startT,
          startValue: session.startValue,
          endT: session.endT,
          endValue: session.endValue,
          avgValue: (session.startValue + session.endValue) / 2,
          consumed,
          durationMinutes: session.durationMinutes,
          confirmed: true,
          unit: "g" as const,
          size: plateSize,
        };
        return [
          {
            id: `food-start-${index}-${session.startT}`,
            phase: "start" as const,
            renderT: session.startT,
            renderValue: session.startValue,
            icon: "/illustrations/pink_food_full.png",
            ...common,
          },
          {
            id: `food-end-${index}-${session.endT}`,
            phase: "end" as const,
            renderT: session.endT,
            renderValue: session.endValue,
            icon: "/illustrations/pink_empty.png",
            ...common,
          },
        ];
      })
      .sort((a, b) => a.renderT - b.renderT);
  }, [bowlIntakeSessions]);
  const d3FoodHabitBands = useMemo(() => {
    if (!isAuthoritativeFoodDevice || !bowlDevice?.id)
      return [] as Array<{ id: string; startHour: number; endHour: number }>;
    const fromMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const hours = analyticsHistorySessions
      .filter(
        (session) =>
          session.device_id === bowlDevice.id &&
          session.session_type === "food" &&
          new Date(session.session_start).getTime() >= fromMs,
      )
      .map((session) =>
        toCycleHourOffset(
          new Date(session.session_start).getTime(),
          d3CycleStartMs,
        ),
      )
      .filter((hour) => Number.isFinite(hour) && hour >= 0 && hour <= 24);
    if (!hours.length)
      return [] as Array<{ id: string; startHour: number; endHour: number }>;
    const bins = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hours.filter((value) => value >= hour && value < hour + 1).length,
    }));
    const threshold = Math.max(1, Math.ceil(hours.length * 0.18));
    return bins
      .filter((bin) => bin.count >= threshold)
      .map((bin, index) => ({
        id: `habit-${index}-${bin.hour}`,
        startHour: bin.hour,
        endHour: bin.hour + 1,
      }));
  }, [
    analyticsHistorySessions,
    bowlDevice?.id,
    d3CycleStartMs,
    isAuthoritativeFoodDevice,
  ]);
  const d3FoodAnomaly = useMemo(() => {
    if (!isAuthoritativeFoodDevice) {
      return {
        state: "no_evidence" as D3AnomalyState,
        label: "Sin evidencia",
        detail: `Solo ${AUTHORITATIVE_FOOD_DEVICE_CODE} confirma comida`,
      };
    }
    const daySessions = bowlIntakeSessions
      .slice()
      .sort((a, b) => a.startT - b.startT);
    if (!daySessions.length) {
      return {
        state: "pending" as D3AnomalyState,
        label: "No ha comido aún",
        detail: "No hay sesión confirmada en este ciclo",
      };
    }
    const fromMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const historyHours = analyticsHistorySessions
      .filter(
        (session) =>
          session.device_id === bowlDevice?.id &&
          session.session_type === "food" &&
          new Date(session.session_start).getTime() >= fromMs,
      )
      .map(
        (session) =>
          new Date(session.session_start).getHours() +
          new Date(session.session_start).getMinutes() / 60,
      )
      .filter((value) => Number.isFinite(value));
    if (!historyHours.length) {
      return {
        state: "normal" as D3AnomalyState,
        label: "Día normal",
        detail: "Aún sin baseline histórico",
      };
    }
    const mean =
      historyHours.reduce((acc, value) => acc + value, 0) / historyHours.length;
    const first = new Date(daySessions[0].startT);
    const firstHour = first.getHours() + first.getMinutes() / 60;
    const diff = Math.abs(firstHour - mean);
    if (diff <= 1.5) {
      return {
        state: "normal" as D3AnomalyState,
        label: "Día normal",
        detail: "Comida dentro del horario habitual",
      };
    }
    return {
      state: "off_schedule" as D3AnomalyState,
      label: "Fuera de horario",
      detail: "Comida confirmada fuera de patrón",
    };
  }, [
    analyticsHistorySessions,
    bowlDevice?.id,
    bowlIntakeSessions,
    isAuthoritativeFoodDevice,
  ]);
  const d3DateInputValue = useMemo(() => {
    const selected = new Date();
    selected.setDate(selected.getDate() - dayCycleOffsetDays);
    return selected.toISOString().slice(0, 10);
  }, [dayCycleOffsetDays]);
  const applyD3Date = (value: string) => {
    if (!value) return;
    const selected = new Date(`${value}T00:00:00`);
    if (Number.isNaN(selected.getTime())) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (today.getTime() - selected.getTime()) / (24 * 60 * 60 * 1000),
    );
    setDayCycleOffsetDays(Math.max(0, diffDays));
  };
  const d3MultiDayRows = useMemo<MultiDayRow[]>(() => {
    const rows: MultiDayRow[] = [];
    for (let index = 0; index < 4; index += 1) {
      const offset = dayCycleOffsetDays + index;
      const anchor = new Date();
      anchor.setDate(anchor.getDate() - offset);
      const window = getDayNightWindow(anchor);
      const label = offset === 0 ? "Hoy" : formatCycleDate(window.startMs);
      const foodPoints = toDayNightPoints(
        bowlDevice?.id ? (deviceHistoryReadings[bowlDevice.id] ?? []) : [],
        window.startMs,
        window.endMs,
        selectBowlSeriesValue,
      );
      const waterPoints = toDayNightPoints(
        waterDevice?.id ? (deviceHistoryReadings[waterDevice.id] ?? []) : [],
        window.startMs,
        window.endMs,
        selectWaterSeriesValue,
      );
      rows.push({
        key: `row-${offset}-${window.startMs}`,
        label,
        startMs: window.startMs,
        foodPoints,
        waterPoints,
      });
    }
    return rows;
  }, [
    bowlDevice?.id,
    dayCycleOffsetDays,
    deviceHistoryReadings,
    selectBowlSeriesValue,
    selectWaterSeriesValue,
    waterDevice?.id,
  ]);
  const d3MiniPath = useCallback(
    (
      points: DayNightPoint[],
      rowStartMs: number,
      rowYDomain: readonly [number, number],
      width: number,
      height: number,
    ) => {
      if (points.length < 2) return "";
      const x = d3.scaleLinear().domain([0, 24]).range([0, width]);
      const y = d3.scaleLinear().domain(rowYDomain).range([height, 0]);
      const line = d3
        .line<DayNightPoint>()
        .x((point) => x(toCycleHourOffset(point.t, rowStartMs)))
        .y((point) => y(point.y))
        .curve(d3.curveMonotoneX);
      return line(points) ?? "";
    },
    [],
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
  const d3HeatBins = useMemo(() => {
    const bins = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
    }));
    const sources = [...bowlHistoryPoints, ...waterHistoryPoints];
    for (const point of sources) {
      const offset = toCycleHourOffsetByTimestamp(point.t);
      if (!Number.isFinite(offset)) continue;
      const index = Math.floor(offset);
      if (index >= 0 && index < 24) {
        bins[index].count += 1;
      }
    }
    return bins;
  }, [bowlHistoryPoints, waterHistoryPoints]);
  const d3HeatMax = useMemo(
    () => d3.max(d3HeatBins, (bin) => bin.count) ?? 0,
    [d3HeatBins],
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
  const bowlConsumptionSummary = useMemo(
    () => summarizeSessionsByPeriods(bowlHistorySessions, nowMs),
    [bowlHistorySessions, nowMs],
  );
  const waterConsumptionSummary = useMemo(
    () => summarizeSessionsByPeriods(waterHistorySessions, nowMs),
    [waterHistorySessions, nowMs],
  );

  const waterAnalyticsSummary = useMemo(() => {
    if (!waterDevice?.id) return null;
    const deviceSessions = analyticsHistorySessions.filter(
      (s) => s.device_id === waterDevice.id,
    );
    if (!deviceSessions.length) return null;
    return summarizeAnalyticsSessionsByPeriods(
      deviceSessions,
      "water_ml",
      nowMs,
    );
  }, [analyticsHistorySessions, waterDevice?.id, nowMs]);

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
      description:
        "Promedio por evento individual durante los últimos 30 días.",
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
                              : `${(waterAnalyticsSummary ?? waterConsumptionSummary)[summaryPeriod].cycles} veces/${activePeriodLabel}`}
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
                                (waterAnalyticsSummary ??
                                  waterConsumptionSummary)[summaryPeriod]
                                  .consumed,
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
                        <div
                          key={`period-${key}`}
                          className="group relative w-full"
                        >
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
              <div className="flex flex-col gap-2">
                <article className="today-bowl-card today-wellness-card rounded-[var(--radius)] border border-emerald-100 bg-white p-4 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)] transition-transform duration-200 ease-out hover:scale-[1.02] md:p-5">
                  <div className="flex flex-col gap-4">
                    <header className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          Alimentación
                        </p>
                        <h3 className="mt-1 text-[26px] font-semibold tracking-[0.02em] text-slate-900">
                          Registro real de alimentación
                        </h3>
                      </div>
                      <div className="today-wellness-status-row flex flex-wrap items-center justify-end gap-2">
                        <span className="today-wellness-status-chip border border-slate-200 bg-white text-slate-700">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full border ${powerDotStyles[bowlPowerState]}`}
                            aria-hidden="true"
                          />
                          {getOperationalLabel(bowlPowerState)}
                        </span>
                        <span className="today-wellness-status-chip border border-slate-200 bg-white text-slate-700">
                          <span aria-hidden="true">📶</span>
                          {getConnectivityLabel(
                            bowlLatestReading?.recorded_at ??
                              bowlDevice?.last_seen ??
                              null,
                          )}
                        </span>
                        <span className="today-wellness-status-chip border border-slate-200 bg-white text-slate-700">
                          <BatteryStatusIcon
                            level={bowlDevice?.battery_level ?? null}
                            className="h-4 w-4 text-slate-700"
                          />
                          {bowlDevice?.battery_level !== null &&
                          bowlDevice?.battery_level !== undefined
                            ? `${Math.round(bowlDevice.battery_level)}%`
                            : "Batería N/D"}
                        </span>
                      </div>
                    </header>

                    <div className="rounded-[calc(var(--radius)-10px)] border border-emerald-100 bg-[linear-gradient(180deg,rgba(236,253,245,0.9)_0%,rgba(255,255,255,0.96)_100%)] px-4 py-3">
                      <p className="text-sm font-medium text-slate-600">
                        {bowlWellness.lastEventLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-sm font-semibold ${getWellnessToneClasses(
                            bowlWellness.stateLabel,
                            "food",
                          )}`}
                        >
                          Estado: {bowlWellness.stateLabel}
                        </span>
                        <p className="text-sm text-slate-500">
                          {bowlWellness.actionLabel}
                        </p>
                      </div>
                    </div>

                    <div className="today-wellness-visual grid items-center gap-4 md:grid-cols-[68px_minmax(0,1fr)]">
                      <div className="today-wellness-bar-shell flex justify-center">
                        <div className="today-wellness-bar today-wellness-bar-food">
                          <div
                            className={`today-wellness-bar-fill today-wellness-bar-fill-food ${
                              bowlWellness.hasEvidence
                                ? "is-confirmed"
                                : "is-empty"
                            }`}
                          />
                          <div className="today-wellness-bar-guides">
                            {Array.from({ length: 9 }).map((_, index) => (
                              <span key={`food-guide-${index}`} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="today-wellness-plate-panel flex flex-col items-center rounded-[calc(var(--radius)-10px)] border border-slate-100 bg-white/90 px-4 py-4 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.5)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {bowlWellness.levelLabel}
                        </p>
                        <Image
                          src="/illustrations/pink_food_full.png"
                          alt="Kittypau comedero"
                          width={224}
                          height={164}
                          className="mx-auto mt-2 h-40 w-auto object-contain object-center"
                        />
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          Evidencia física del plato
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          {bowlDevice?.device_id ?? "KPCLXXXX"}
                        </p>
                      </div>
                    </div>

                    <details className="today-wellness-detail rounded-[calc(var(--radius)-10px)] border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                        <span className="flex items-center justify-between gap-3">
                          <span>Ver detalle técnico</span>
                          <span className="text-slate-400">▼</span>
                        </span>
                      </summary>
                      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-900">
                            Contenido actual:
                          </span>{" "}
                          {bowlContentWeightText}
                          {renderTrend(
                            bowlContentWeightGrams,
                            bowlPrevContentWeightGrams,
                          )}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Peso del plato:
                          </span>{" "}
                          {bowlPlateWeightText}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Lectura del sensor:
                          </span>{" "}
                          {bowlSensorWeightText}
                          {renderTrend(
                            bowlGrossWeightGrams,
                            bowlPrevGrossWeightGrams,
                          )}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Última lectura:
                          </span>{" "}
                          {formatTimestamp(
                            bowlLatestReading?.recorded_at ?? null,
                          )}
                        </p>
                        <p className="md:col-span-2">
                          <span className="font-semibold text-slate-900">
                            Ambiente:
                          </span>{" "}
                          {bowlTempText} · {bowlHumidityText} · {bowlLightText}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            ID dispositivo:
                          </span>{" "}
                          {bowlDevice?.device_id ?? "KPCLXXXX"}
                        </p>
                      </div>
                    </details>
                  </div>
                </article>
                <div className="w-full rounded-[var(--radius)] border border-slate-200 bg-white p-3 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.25)]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Categorías
                    </p>
                    {bowlCategoryFeedback ? (
                      <p className="text-[10px] font-semibold text-slate-500">
                        {bowlCategoryFeedback}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                    {BOWL_CATEGORY_CHOICES.map((choice) => {
                      const isBusy = bowlCategoryBusy === choice.key;
                      const isPendingConfirm =
                        choice.key === "kpcl_con_plato" &&
                        bowlDevice?.id &&
                        bowlPendingPlateConfirm[bowlDevice.id];
                      return (
                        <button
                          key={choice.key}
                          type="button"
                          onClick={() => void handleBowlCategory(choice)}
                          disabled={Boolean(bowlCategoryBusy)}
                          className={`flex aspect-square items-center justify-center rounded-xl border px-1.5 py-1.5 text-center text-[8px] font-semibold uppercase leading-tight tracking-[0.06em] transition-all duration-200 ease-out ${
                            isBusy || isPendingConfirm
                              ? "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-[0_10px_18px_-14px_rgba(16,185,129,0.65)]"
                              : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                          aria-pressed={isBusy}
                          aria-label={`Registrar ${choice.label} para ${bowlDevice?.device_id ?? "KPCL"}`}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <article className="today-bowl-card today-wellness-card rounded-[var(--radius)] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)] transition-transform duration-200 ease-out hover:scale-[1.02] md:p-5">
                  <div className="flex flex-col gap-4">
                    <header className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                          Hidratación
                        </p>
                        <h3 className="mt-1 text-[26px] font-semibold tracking-[0.02em] text-slate-900">
                          Registro real de hidratación
                        </h3>
                      </div>
                      <div className="today-wellness-status-row flex flex-wrap items-center justify-end gap-2">
                        <span className="today-wellness-status-chip border border-slate-200 bg-white text-slate-700">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full border ${powerDotStyles[waterPowerState]}`}
                            aria-hidden="true"
                          />
                          {getOperationalLabel(waterPowerState)}
                        </span>
                        <span className="today-wellness-status-chip border border-slate-200 bg-white text-slate-700">
                          <span aria-hidden="true">📶</span>
                          {getConnectivityLabel(
                            waterLatestReading?.recorded_at ??
                              waterDevice?.last_seen ??
                              null,
                          )}
                        </span>
                        <span className="today-wellness-status-chip border border-slate-200 bg-white text-slate-700">
                          <BatteryStatusIcon
                            level={waterDevice?.battery_level ?? null}
                            className="h-4 w-4 text-slate-700"
                          />
                          {waterDevice?.battery_level !== null &&
                          waterDevice?.battery_level !== undefined
                            ? `${Math.round(waterDevice.battery_level)}%`
                            : "Batería N/D"}
                        </span>
                      </div>
                    </header>

                    <div className="rounded-[calc(var(--radius)-10px)] border border-sky-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.92)_0%,rgba(255,255,255,0.96)_100%)] px-4 py-3">
                      <p className="text-sm font-medium text-slate-600">
                        {waterWellness.lastEventLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-sm font-semibold ${getWellnessToneClasses(
                            waterWellness.stateLabel,
                            "water",
                          )}`}
                        >
                          Estado: {waterWellness.stateLabel}
                        </span>
                        <p className="text-sm text-slate-500">
                          {waterWellness.actionLabel}
                        </p>
                      </div>
                    </div>

                    <div className="today-wellness-visual grid items-center gap-4 md:grid-cols-[68px_minmax(0,1fr)]">
                      <div className="today-wellness-bar-shell flex justify-center">
                        <div className="today-wellness-bar today-wellness-bar-water">
                          <div
                            className={`today-wellness-bar-fill today-wellness-bar-fill-water ${
                              waterWellness.hasEvidence
                                ? "is-confirmed"
                                : "is-empty"
                            }`}
                          />
                          <div className="today-wellness-bar-guides">
                            {Array.from({ length: 9 }).map((_, index) => (
                              <span key={`water-guide-${index}`} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="today-wellness-plate-panel flex flex-col items-center rounded-[calc(var(--radius)-10px)] border border-slate-100 bg-white/90 px-4 py-4 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.5)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {waterWellness.levelLabel}
                        </p>
                        <Image
                          src="/illustrations/green_water_full.png"
                          alt="Kittypau bebedero"
                          width={224}
                          height={164}
                          className="mx-auto mt-2 h-40 w-auto object-contain object-center"
                        />
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          Evidencia física del plato
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          {waterDevice?.device_id ?? "KPCLXXXX"}
                        </p>
                      </div>
                    </div>

                    <details className="today-wellness-detail rounded-[calc(var(--radius)-10px)] border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                        <span className="flex items-center justify-between gap-3">
                          <span>Ver detalle técnico</span>
                          <span className="text-slate-400">▼</span>
                        </span>
                      </summary>
                      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-900">
                            Nivel actual:
                          </span>{" "}
                          {waterVolumeMlText}
                          {renderTrend(
                            waterContentWeightGrams,
                            waterPrevContentWeightGrams,
                          )}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Peso del plato:
                          </span>{" "}
                          {waterPlateWeightText}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Lectura del sensor:
                          </span>{" "}
                          {waterSensorWeightText}
                          {renderTrend(
                            waterGrossWeightGrams,
                            waterPrevGrossWeightGrams,
                          )}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Última lectura:
                          </span>{" "}
                          {formatTimestamp(
                            waterLatestReading?.recorded_at ?? null,
                          )}
                        </p>
                        <p className="md:col-span-2">
                          <span className="font-semibold text-slate-900">
                            Ambiente:
                          </span>{" "}
                          {waterTempText} · {waterHumidityText} ·{" "}
                          {waterLightText}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            ID dispositivo:
                          </span>{" "}
                          {waterDevice?.device_id ?? "KPCLXXXX"}
                        </p>
                      </div>
                    </details>
                  </div>
                </article>
                <div className="w-full rounded-[var(--radius)] border border-slate-200 bg-white p-3 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.25)]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Categorías
                    </p>
                    {waterCategoryFeedback ? (
                      <p className="text-[10px] font-semibold text-slate-500">
                        {waterCategoryFeedback}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                    {WATER_CATEGORY_CHOICES.map((choice) => {
                      const isBusy = waterCategoryBusy === choice.key;
                      const isPendingConfirm =
                        choice.key === "kpcl_con_plato" &&
                        waterDevice?.id &&
                        waterPendingPlateConfirm[waterDevice.id];
                      return (
                        <button
                          key={choice.key}
                          type="button"
                          onClick={() => void handleWaterCategory(choice)}
                          disabled={Boolean(waterCategoryBusy)}
                          className={`flex aspect-square items-center justify-center rounded-xl border px-1.5 py-1.5 text-center text-[8px] font-semibold uppercase leading-tight tracking-[0.06em] transition-all duration-200 ease-out ${
                            isBusy || isPendingConfirm
                              ? "border-sky-300 bg-sky-100 text-sky-800 shadow-[0_10px_18px_-14px_rgba(14,116,190,0.6)]"
                              : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                          aria-pressed={isBusy}
                          aria-label={`Registrar ${choice.label} para ${waterDevice?.device_id ?? "KPBW"}`}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
              {!isAuthoritativeFoodDevice ? (
                <p className="mt-2 w-full text-center text-xs font-medium text-amber-700">
                  Alimentación sin evidencia auditada: solo se confirma comida
                  desde {AUTHORITATIVE_FOOD_DEVICE_CODE} con categorías
                  inicio/termino.
                </p>
              ) : null}
            </div>
          </section>

          <section
            id="kpcl-d3-object"
            role="region"
            aria-label="Gráfico D3 KPCL mejorado"
            className="surface-card freeform-rise px-4 py-4 md:px-6 md:py-5"
          >
            <div className="rounded-[calc(var(--radius)-8px)] border border-emerald-100 bg-[linear-gradient(180deg,rgba(236,253,245,0.5)_0%,rgba(240,249,255,0.45)_45%,rgba(255,255,255,0.96)_100%)] p-4 shadow-[0_14px_30px_-24px_rgba(16,185,129,0.7)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    KPCL D3
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900 md:text-lg">
                    Versión semántica mejorada del gráfico original
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Fuente real: {KPCL_D3_CHART_OBJECT.data.readingsEndpoint} ·
                    Zona horaria {KPCL_D3_CHART_OBJECT.timezone}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        d3FoodAnomaly.state === "normal"
                          ? "bg-emerald-500"
                          : d3FoodAnomaly.state === "off_schedule"
                            ? "bg-amber-500"
                            : d3FoodAnomaly.state === "pending"
                              ? "bg-rose-500"
                              : "bg-slate-300"
                      }`}
                    />
                    <span>{d3FoodAnomaly.label}</span>
                    <span className="text-slate-500">
                      · {d3FoodAnomaly.detail}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Image
                    src={KPCL_D3_CHART_OBJECT.visuals.assets.foodIcon}
                    alt=""
                    aria-hidden={true}
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain opacity-95"
                  />
                  <Image
                    src={KPCL_D3_CHART_OBJECT.visuals.assets.waterIcon}
                    alt=""
                    aria-hidden={true}
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain opacity-95"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setDayCycleOffsetDays((prev) => prev + 1)}
                  className="px-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
                  aria-label="Ciclo anterior D3"
                  title="Ciclo anterior D3"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => setDayCycleOffsetDays(0)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                  aria-label="Volver a hoy D3"
                  title="Volver a hoy D3"
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
                  aria-label="Ciclo siguiente D3"
                  title="Ciclo siguiente D3"
                >
                  ▶
                </button>
                <input
                  type="date"
                  value={d3DateInputValue}
                  onChange={(event) => applyD3Date(event.target.value)}
                  className="h-8 rounded-[10px] border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700"
                  aria-label="Seleccionar fecha D3"
                />
              </div>

              <div className="relative mt-3 overflow-hidden rounded-[12px] border border-white/80 bg-gradient-to-b from-rose-50/35 via-emerald-50/20 to-white">
                <svg
                  viewBox={`0 0 ${d3Canvas.width} ${d3Canvas.height}`}
                  className="h-[360px] w-full"
                  role="img"
                  aria-label="Gráfico D3 de ciclo diario"
                  onMouseMove={(event) => {
                    const [mx] = d3.pointer(event);
                    const clampedX = Math.min(
                      d3Canvas.marginLeft + d3InnerWidth,
                      Math.max(d3Canvas.marginLeft, mx),
                    );
                    const ts = d3XScale.invert(clampedX);
                    setD3CursorTs(ts);
                  }}
                  onMouseLeave={() => {
                    setD3CursorTs(null);
                    setD3HoverMarker(null);
                  }}
                >
                  <image
                    href={KPCL_D3_CHART_OBJECT.visuals.assets.fondo}
                    x={d3Canvas.marginLeft}
                    y={d3Canvas.marginTop}
                    width={d3InnerWidth}
                    height={d3InnerHeight}
                    preserveAspectRatio="xMidYMid slice"
                    opacity={1}
                  />
                  {d3HeatBins.map((bin) => {
                    if (d3HeatMax <= 0 || bin.count <= 0) return null;
                    const from = d3CycleStartMs + bin.hour * 60 * 60 * 1000;
                    const to = d3CycleStartMs + (bin.hour + 1) * 60 * 60 * 1000;
                    const x = d3XScale(from);
                    const width = Math.max(0, d3XScale(to) - x);
                    const normalized = bin.count / d3HeatMax;
                    return (
                      <rect
                        key={`heat-${bin.hour}`}
                        x={x}
                        y={d3Canvas.marginTop}
                        width={width}
                        height={d3InnerHeight}
                        fill="rgba(15,23,42,0.12)"
                        opacity={Math.min(0.2, 0.02 + normalized * 0.14)}
                      />
                    );
                  })}
                  {d3BackgroundBands.map((band) => {
                    const from = d3CycleStartMs + band.from * 60 * 60 * 1000;
                    const to = d3CycleStartMs + band.to * 60 * 60 * 1000;
                    const x = d3XScale(from);
                    const width = Math.max(0, d3XScale(to) - x);
                    return (
                      <rect
                        key={`band-${band.key}`}
                        x={x}
                        y={d3Canvas.marginTop}
                        width={width}
                        height={d3InnerHeight}
                        fill={band.color}
                        opacity={d3HoverMarker ? 0.4 : 1}
                      />
                    );
                  })}
                  {d3FoodHabitBands.map((band) => {
                    const from =
                      d3CycleStartMs + band.startHour * 60 * 60 * 1000;
                    const to = d3CycleStartMs + band.endHour * 60 * 60 * 1000;
                    const x = d3XScale(from);
                    const width = Math.max(0, d3XScale(to) - x);
                    return (
                      <rect
                        key={band.id}
                        x={x}
                        y={d3Canvas.marginTop}
                        width={width}
                        height={d3InnerHeight}
                        fill="rgba(16,185,129,0.12)"
                      />
                    );
                  })}
                  {d3SessionConnectors.map((connector) => (
                    <line
                      key={connector.id}
                      x1={d3XScale(connector.startT)}
                      x2={d3XScale(connector.endT)}
                      y1={d3YScale(connector.yValue)}
                      y2={d3YScale(connector.yValue)}
                      stroke="#f472b6"
                      strokeWidth={3}
                      strokeDasharray="6 6"
                      opacity={0.7}
                    />
                  ))}
                  {[0, 6, 12, 18, 24].map((offset) => {
                    const tickTs = d3CycleStartMs + offset * 60 * 60 * 1000;
                    const x = d3XScale(tickTs);
                    return (
                      <g key={`d3-tick-${offset}`}>
                        <line
                          x1={x}
                          y1={d3Canvas.marginTop}
                          x2={x}
                          y2={d3Canvas.marginTop + d3InnerHeight}
                          stroke="rgba(148,163,184,0.34)"
                          strokeDasharray="3 4"
                        />
                        <text
                          x={x}
                          y={d3Canvas.marginTop + d3InnerHeight + 16}
                          textAnchor="middle"
                          className="fill-slate-500 text-[11px] font-semibold"
                        >
                          {formatHourFromOffset(offset)}
                        </text>
                      </g>
                    );
                  })}
                  {d3LinePathFood ? (
                    <path
                      d={d3LinePathFood}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth={1.1}
                      opacity={0.35}
                    />
                  ) : null}
                  {d3FoodSegments.map((segment) => (
                    <line
                      key={segment.id}
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                      stroke="#94a3b8"
                      strokeWidth={Math.max(
                        1.2,
                        Math.min(2.6, segment.strokeWidth * 0.5),
                      )}
                      strokeLinecap="round"
                      opacity={0.42}
                    />
                  ))}
                  {d3LinePathWater ? (
                    <path
                      d={d3LinePathWater}
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth={1.1}
                      opacity={0.28}
                    />
                  ) : null}
                  {d3WaterSegments.map((segment) => (
                    <line
                      key={segment.id}
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                      stroke="#cbd5e1"
                      strokeWidth={Math.max(
                        1.1,
                        Math.min(2.2, segment.strokeWidth * 0.45),
                      )}
                      strokeLinecap="round"
                      opacity={0.34}
                    />
                  ))}
                  {d3NowTs !== null ? (
                    <g>
                      <line
                        x1={d3XScale(d3NowTs)}
                        y1={d3Canvas.marginTop}
                        x2={d3XScale(d3NowTs)}
                        y2={d3Canvas.marginTop + d3InnerHeight}
                        stroke="rgba(15,23,42,0.72)"
                        strokeDasharray="2 3"
                      />
                      <text
                        x={d3XScale(d3NowTs)}
                        y={d3Canvas.marginTop - 8}
                        textAnchor="middle"
                        className="fill-slate-700 text-[10px] font-bold"
                      >
                        Ahora
                      </text>
                    </g>
                  ) : null}
                  {d3CursorTs !== null ? (
                    <line
                      x1={d3XScale(d3CursorTs)}
                      y1={d3Canvas.marginTop}
                      x2={d3XScale(d3CursorTs)}
                      y2={d3Canvas.marginTop + d3InnerHeight}
                      stroke="rgba(15,23,42,0.55)"
                      strokeDasharray="5 4"
                    />
                  ) : null}
                  {d3Markers.map((marker) => {
                    const x = d3XScale(marker.renderT);
                    const y = d3YScale(marker.renderValue);
                    return (
                      <g
                        key={marker.id}
                        transform={`translate(${x}, ${y})`}
                        onMouseEnter={() =>
                          setD3HoverMarker({
                            marker,
                            anchorX: x,
                            anchorY: y,
                          })
                        }
                        onMouseLeave={() => setD3HoverMarker(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          cx={0}
                          cy={0}
                          r={22}
                          fill={
                            marker.phase === "start"
                              ? "rgba(34,197,94,0.18)"
                              : "rgba(239,68,68,0.18)"
                          }
                        />
                        <image
                          href={marker.icon}
                          x={-marker.size / 2}
                          y={-marker.size / 2}
                          width={marker.size}
                          height={marker.size}
                          opacity={0.98}
                        >
                          <animateTransform
                            attributeName="transform"
                            type="scale"
                            from="0.2"
                            to="1"
                            dur="320ms"
                            begin="0s"
                            fill="freeze"
                          />
                        </image>
                      </g>
                    );
                  })}
                </svg>
                {d3HoverMarker ? (
                  <div
                    className="pointer-events-none absolute z-40 rounded-[10px] border border-slate-700/40 bg-slate-900/95 px-3 py-2 text-[11px] text-slate-100 shadow-[0_10px_22px_-14px_rgba(15,23,42,0.8)]"
                    style={{
                      left: `calc(${(d3HoverMarker.anchorX / d3Canvas.width) * 100}% + 28px)`,
                      top: `calc(${(d3HoverMarker.anchorY / d3Canvas.height) * 100}% - 20px)`,
                    }}
                  >
                    <p className="font-semibold">
                      {d3HoverMarker.marker.phase === "start"
                        ? "Inicio de sesión"
                        : "Término de sesión"}
                    </p>
                    <p>{formatSessionClock(d3HoverMarker.marker.renderT)}</p>
                    <p>Comió: {d3HoverMarker.marker.consumed} g</p>
                    <p>
                      Duración:{" "}
                      {formatSessionDurationClock(
                        d3HoverMarker.marker.durationMinutes,
                      )}
                    </p>
                    <p>Sesión confirmada</p>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 rounded-[12px] border border-slate-200 bg-white/75 px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Comparación 4 ciclos
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Dominio X compartido 06:00 → 06:00
                  </p>
                </div>
                <div className="grid gap-2">
                  {d3MultiDayRows.map((row) => {
                    const combined = [...row.foodPoints, ...row.waterPoints];
                    const rowDomain: readonly [number, number] = combined.length
                      ? ([
                          Math.max(
                            0,
                            (d3.min(combined, (point) => point.y) ?? 0) - 6,
                          ),
                          (d3.max(combined, (point) => point.y) ?? 100) + 6,
                        ] as const)
                      : d3YDomain;
                    const miniWidth = 960;
                    const miniHeight = 78;
                    const miniX = d3
                      .scaleLinear()
                      .domain([0, 24])
                      .range([0, miniWidth]);
                    const miniY = d3
                      .scaleLinear()
                      .domain(rowDomain)
                      .range([miniHeight, 0]);
                    const rowFoodSessions = bowlHistorySessions.filter(
                      (session) =>
                        session.startT >= row.startMs &&
                        session.startT < row.startMs + 24 * 60 * 60 * 1000,
                    );
                    const foodPath = d3MiniPath(
                      row.foodPoints,
                      row.startMs,
                      rowDomain,
                      miniWidth,
                      miniHeight,
                    );
                    const waterPath = d3MiniPath(
                      row.waterPoints,
                      row.startMs,
                      rowDomain,
                      miniWidth,
                      miniHeight,
                    );
                    return (
                      <div
                        key={row.key}
                        className="grid grid-cols-[94px_1fr] items-center gap-2 rounded-[10px] border border-slate-100 bg-white px-2 py-2"
                      >
                        <p className="truncate text-[11px] font-semibold text-slate-600">
                          {row.label}
                        </p>
                        <svg
                          viewBox={`0 0 ${miniWidth} ${miniHeight}`}
                          className="h-[72px] w-full"
                          role="img"
                          aria-label={`Patrón de ${row.label}`}
                        >
                          {[0, 6, 12, 18, 24].map((hour) => {
                            const x = (hour / 24) * miniWidth;
                            return (
                              <line
                                key={`${row.key}-tick-${hour}`}
                                x1={x}
                                y1={0}
                                x2={x}
                                y2={miniHeight}
                                stroke="rgba(148,163,184,0.24)"
                                strokeDasharray="2 4"
                              />
                            );
                          })}
                          {foodPath ? (
                            <path
                              d={foodPath}
                              fill="none"
                              stroke={KPCL_D3_CHART_OBJECT.visuals.colors.food}
                              strokeWidth={2}
                              opacity={0.88}
                            />
                          ) : null}
                          {waterPath ? (
                            <path
                              d={waterPath}
                              fill="none"
                              stroke={KPCL_D3_CHART_OBJECT.visuals.colors.water}
                              strokeWidth={2}
                              opacity={0.88}
                            />
                          ) : null}
                          {rowFoodSessions.map((session, index) => {
                            const startX = miniX(
                              toCycleHourOffset(session.startT, row.startMs),
                            );
                            const endX = miniX(
                              toCycleHourOffset(session.endT, row.startMs),
                            );
                            const y = miniY(
                              (session.startValue + session.endValue) / 2,
                            );
                            return (
                              <g
                                key={`${row.key}-session-${index}-${session.startT}`}
                              >
                                <line
                                  x1={startX}
                                  x2={endX}
                                  y1={y}
                                  y2={y}
                                  stroke="#f472b6"
                                  strokeWidth={1.8}
                                  strokeDasharray="4 4"
                                  opacity={0.72}
                                />
                                <circle
                                  cx={startX}
                                  cy={miniY(session.startValue)}
                                  r={4.2}
                                  fill="rgba(34,197,94,0.75)"
                                />
                                <circle
                                  cx={endX}
                                  cy={miniY(session.endValue)}
                                  r={4.2}
                                  fill="rgba(239,68,68,0.75)"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </header>

        <section className="surface-card freeform-rise px-6 py-5">
          {/* Pills de valores actuales */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "hsl(350 65% 62%)" }}
              />
              <span className="text-xs uppercase tracking-widest text-slate-400">
                Comida
              </span>
              <span className="font-semibold text-slate-800">
                {todayLatestWeight !== null
                  ? `${Math.round(todayLatestWeight)} g`
                  : "N/D"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "hsl(25 80% 52%)" }}
              />
              <span className="text-xs uppercase tracking-widest text-slate-400">
                Temp
              </span>
              <span className="font-semibold text-slate-800">
                {todayLatestTemp !== null
                  ? `${Math.round(todayLatestTemp)} °C`
                  : "N/D"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "hsl(198,70%,45%)" }}
              />
              <span className="text-xs uppercase tracking-widest text-slate-400">
                Humedad
              </span>
              <span className="font-semibold text-slate-800">
                {todayLatestHumidity !== null
                  ? `${Math.round(todayLatestHumidity)} %`
                  : "N/D"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "hsl(44,90%,52%)" }}
              />
              <span className="text-xs uppercase tracking-widest text-slate-400">
                Luz
              </span>
              <span className="font-semibold text-slate-800">
                {todayLatestLight !== null
                  ? `${Math.round(todayLatestLight)} %`
                  : "N/D"}
              </span>
            </div>
          </div>
          {/* Gráfico combinado ancho */}
          <div className="h-40 w-full rounded-[calc(var(--radius)-8px)] bg-slate-50 px-3 py-3 sm:h-52">
            {todayWeightSeries.length > 1 ||
            todayTempSeries.length > 1 ||
            todayHumiditySeries.length > 1 ||
            todayLightSeries.length > 1 ? (
              <Line
                data={{
                  labels: orderedToday3d.map((p) =>
                    chileShortTime(p.timestamp),
                  ),
                  datasets: [
                    {
                      label: "Comida (g)",
                      data: orderedToday3d.map((p) => p.value),
                      borderColor: "hsl(350 65% 62%)",
                      backgroundColor: "hsl(350 65% 62%)",
                      borderWidth: 2.5,
                      pointRadius: 0,
                      tension: 0.3,
                      yAxisID: "yWeight",
                    },
                    {
                      label: "Temp (°C)",
                      data: todayTempSeries
                        .slice(0, 288)
                        .reverse()
                        .map((p) => p.value),
                      borderColor: "hsl(25 80% 52%)",
                      backgroundColor: "hsl(25 80% 52%)",
                      borderWidth: 2,
                      pointRadius: 0,
                      tension: 0.3,
                      yAxisID: "yEnv",
                    },
                    {
                      label: "Humedad (%)",
                      data: todayHumiditySeries
                        .slice(0, 288)
                        .reverse()
                        .map((p) => p.value),
                      borderColor: "hsl(198,70%,45%)",
                      backgroundColor: "hsl(198,70%,45%)",
                      borderWidth: 2,
                      pointRadius: 0,
                      tension: 0.3,
                      yAxisID: "yEnv",
                    },
                    {
                      label: "Luz (%)",
                      data: todayLightSeries
                        .slice(0, 288)
                        .reverse()
                        .map((p) => p.value),
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
                      callbacks: {
                        title: (items) => {
                          const idx = items[0]?.dataIndex;
                          return idx !== undefined
                            ? formatToday3dTooltipTitle(idx)
                            : "";
                        },
                        label: (ctx) => {
                          const raw =
                            typeof ctx.parsed.y === "number"
                              ? ctx.parsed.y
                              : null;
                          return raw !== null
                            ? `${ctx.dataset.label}: ${Math.round(raw)}`
                            : (ctx.dataset.label ?? "");
                        },
                      },
                    },
                  },
                  interaction: { mode: "nearest", intersect: false },
                  scales: {
                    x: {
                      grid: { display: false },
                      border: {
                        display: true,
                        color:
                          "color-mix(in oklab, hsl(var(--muted-foreground)) 24%, transparent)",
                      },
                      ticks: {
                        maxTicksLimit: 2,
                        color: "hsl(var(--muted-foreground))",
                        font: { size: 11 },
                        autoSkip: false,
                        maxRotation: 0,
                        callback: (_v, i, ticks) =>
                          i === 0
                            ? "-3d"
                            : i === ticks.length - 1
                              ? "Ahora"
                              : "",
                      },
                    },
                    yWeight: {
                      type: "linear",
                      position: "left",
                      grid: { drawOnChartArea: false },
                      border: {
                        display: true,
                        color:
                          "color-mix(in oklab, hsl(var(--muted-foreground)) 24%, transparent)",
                      },
                      ticks: {
                        color: "hsl(350 65% 62%)",
                        font: { size: 10 },
                        maxTicksLimit: 3,
                        callback: (v) => `${Math.round(Number(v))}g`,
                      },
                    },
                    yEnv: {
                      type: "linear",
                      position: "right",
                      grid: { drawOnChartArea: false },
                      border: {
                        display: true,
                        color:
                          "color-mix(in oklab, hsl(var(--muted-foreground)) 24%, transparent)",
                      },
                      ticks: {
                        color: "hsl(25 80% 52%)",
                        font: { size: 10 },
                        maxTicksLimit: 3,
                        callback: (v) => `${Math.round(Number(v))}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <p className="text-xs text-slate-500">
                Aún sin lecturas recientes.
              </p>
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

          <section className="mt-4 rounded-[calc(var(--radius)-6px)] border border-slate-200 bg-white px-4 py-4">
            <OperationalActionsCard
              description="Si faltan datos o aparecen gaps, sigue por la vista operativa."
              actions={[
                { href: "/story", label: "Abrir diario" },
                { href: "/admin", label: "Ver admin" },
                { href: "/registro", label: "Completar registro" },
              ]}
            />
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <article className="rounded-[calc(var(--radius)-8px)] border border-slate-200 bg-slate-50/60 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-900">Lecturas en vivo</p>
                <p className="mt-1">
                  Revisa si hoy hay actividad reciente, frescura y eventos
                  duplicados.
                </p>
              </article>
              <article className="rounded-[calc(var(--radius)-8px)] border border-slate-200 bg-slate-50/60 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-900">
                  Gaps e incidentes
                </p>
                <p className="mt-1">
                  El admin separa bridge offline, device offline y gaps de
                  lectura.
                </p>
              </article>
              <article className="rounded-[calc(var(--radius)-8px)] border border-slate-200 bg-slate-50/60 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-900">
                  Historia y perfil
                </p>
                <p className="mt-1">
                  Story y perfil ayudan cuando el resumen todavía no explica
                  todo.
                </p>
              </article>
            </div>
          </section>

          {!hasAnalyticsHistory ? (
            <div className="mt-4 rounded-[calc(var(--radius)-6px)] border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-800">
              <p className="font-semibold">
                La historia analítica todavía está en construcción
              </p>
              <p className="mt-1 text-sky-700">
                La vista en vivo ya funciona, pero todavía no hay sesiones
                históricas acumuladas para este perfil. Cuando el plato siga
                publicando lecturas, Story empezará a mostrar más contexto.
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <Link href="/story" className="underline">
                  Abrir diario
                </Link>
                <Link href="/pet" className="underline">
                  Revisar perfil
                </Link>
              </div>
            </div>
          ) : null}

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
