"use client";

/**
 * Mapa del archivo (agregado 2026-08-12 para no tener que releer las ~2500
 * líneas cada vez — grepear el nombre de la sección, no confiar en el
 * número de línea, que va a correrse). Ver también
 * Knowledge/04_Frontend/ESTRUCTURA_src_app.md.
 *
 * - Tipos + helpers puros a nivel de módulo (fuera del componente): desde
 *   `hungerBarColor` hasta `isAuthoritativeFoodDeviceCode` — formato de
 *   fechas/timestamps, cálculo de sesiones desde audit_events,
 *   `buildWellnessState` (misma función que usan las cards de Alimentación/
 *   Hidratación).
 * - `export default function TodayPage`: arranca el componente.
 *   - Estado + fetch inicial de pets/devices/readings.
 *   - `useMqttLive` — lecturas en vivo por WebSocket, sección "Live readings
 *     directo desde HiveMQ".
 *   - `primaryPet` — resolución de la mascota activa.
 *   - `hungerBar` (fetch propio a `/api/pets/:id/hunger-bar`) +
 *     `useHungerBarPushAlert` — turno de la notificación push, ver
 *     Knowledge/05_API/SPEC_HungerBar_Alertas.md.
 *   - Efecto "Cargar audit_events" — sesiones de inicio/término
 *     alimentación/hidratación, alimenta bowlHistorySessions/
 *     waterHistorySessions y por lo tanto bowlWellness/waterWellness.
 *   - "Diagnóstico rápido (SPEC_02 U2)" — bowlDiagnostics/waterDiagnostics,
 *     ver `@/lib/device-diagnostics`.
 *   - "Hunger Bar — reemplaza el medidor de combustible" — cálculos para el
 *     bar de Comida del panel Barras Sims.
 *   - JSX: `#today-hero` (Barras Sims — ⚠️ widget sensible, ver
 *     `barras-sims-card.tsx`), `#today-bowls` (cards Alimentación/
 *     Hidratación + Diagnóstico rápido), luego `DayNightTimelineCard`,
 *     `ConsumoKpisCard` (12 KPIs de consumo, SPEC_11 §2.1/§2.2/§2.3 — independiente
 *     de Barras Sims) y `OnboardingGuideModal` (los 3 extraídos a
 *     `today/_components/`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getValidAccessToken, signOutSession } from "@/lib/auth/token";
import { authFetch } from "@/lib/auth/auth-fetch";
import "@/lib/charts";
import { useMqttLive } from "@/lib/hooks/useMqttLive";
import { useHungerBarPushAlert } from "@/lib/hooks/useHungerBarPushAlert";
import { useHungerBarEventNotifications } from "@/lib/hooks/useHungerBarEventNotifications";
import { usePushTokenRegistration } from "@/lib/hooks/usePushTokenRegistration";
import {
  syncSelectedDevice,
  syncSelectedPet,
} from "@/lib/runtime/selection-sync";
import { parseListResponse, resolveDevicePowerState } from "@/lib/utils/api";
import { isFoodDeviceRole, isWaterDeviceRole } from "@/lib/device-role";
import {
  getConnectionHint,
  getActionNotes,
  getBatterySummary,
} from "@/lib/device-diagnostics";
import { type ChartData, type ChartOptions, type Plugin } from "chart.js";
import {
  getChileDayNightWindow,
  chileCompactDatetime,
  chileShortTime,
  chileLongDate,
} from "@/lib/time/chile";
import BarrasSimsCard from "./barras-sims-card";
import BowlWellnessCard from "./bowl-wellness-card";
import DayNightTimelineCard from "./day-night-timeline-card";
import ConsumoKpisCard from "./consumo-kpis-card";
import ConsumoPeriodoCard from "./consumo-periodo-card";
import OnboardingGuideModal from "./onboarding-guide-modal";
import QaTestMealNotification from "@/app/_components/qa-test-meal-notification";
import type { DemoIdentity } from "@/lib/demo-identity";

// Seam de la demo (Knowledge/29_Specs/009-demo-today-en-vivo): este componente
// ES la vista de `/today`. `/today` lo renderiza sin props (todo default =
// comportamiento autenticado actual, byte-idéntico). `/demo` lo renderiza con
// `mode="demo"` + un `fetchImpl` que sirve el bundle de `/api/demo/today` y la
// identidad del visitante. Sin fork: cualquier cambio a esta vista aparece en
// ambas (FR-016 / SC-008).
type TodayFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type TodayScreenProps = {
  mode?: "authed" | "demo";
  fetchImpl?: TodayFetch;
  identity?: DemoIdentity | null;
};

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
  battery_voltage?: number | null;
  battery_source?: string | null;
  battery_is_estimated?: boolean | null;
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

type HungerBarEvent = {
  startAt: string;
  endAt: string;
  deltaG: number;
  durationMin: number;
  category: "alimentacion" | "servido" | "ruido";
  confidence: number;
  isProvisional: boolean;
};

// Espejo de ConsumoKpis (src/lib/consumo-kpis.ts) -- ver
// Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md §2.1/§2.2/§2.3.
type ConsumoKpis = {
  avgDurationMin: number | null;
  avgSpeedGPerMin: number | null;
  mealsToday: number;
  mealsExpectedMedian: number;
  mealsExpectedRange: [number, number];
  ateInPeakHourToday: boolean | null;
  avgIntervalTodayHours: number | null;
  intervalConsistency: "mas_seguido" | "tipico" | "mas_espaciado" | null;
  streakDays: number;
  dailyRegularityCv: number | null;
  withinOwnerRange: { count: number; total: number; percent: number } | null;
  biggestMealG: number | null;
  smallestMealG: number | null;
  servedTotalG: number | null;
  servedToEatenRatio: number | null;
  appetiteTrendGPerDay: number | null;
  noiseEventsPerDayMedian: number | null;
};

type HungerBarResponse = {
  status: "ok" | "sin_datos" | "sin_dispositivo";
  percentage: number | null;
  lastMealDetectedAt: string | null;
  lastMealIsProvisional?: boolean;
  lastMealGramos?: number | null;
  estimatedNextMealAt: string | null;
  intervalUsedMinutes: number | null;
  usingFallback: boolean;
  sampleSize: number;
  alertActive: boolean;
  hoursOverdue: number | null;
  events?: HungerBarEvent[];
  kpis?: ConsumoKpis | null;
};

// "Cuánto come por semana/mes" en vivo -- GET /api/pets/:id/consumo-periodo.
// Endpoint aparte de hunger-bar (ver ese route.ts): ventana 3x más larga,
// se pide 1 sola vez al montar la página, no cada 5 min.
type ConsumoPeriodo = {
  gramos: number;
  comidas: number;
  diasConDatos: number;
  diasTotales: number;
};
type ConsumoPeriodoResponse =
  | { status: "sin_dispositivo" }
  | {
      status: "ok";
      semana: ConsumoPeriodo;
      mes: ConsumoPeriodo;
      ventanaDias: number;
      truncated: boolean;
    };

// v1.1 — gradiente continuo verde→amarillo→rojo. Ver
// Knowledge/05_API/SPEC_HungerBar_Alertas.md §2.
function hungerBarColor(pct: number): string {
  const hue = Math.max(0, Math.min(100, pct)) * 1.2;
  return `hsl(${hue}, 70%, 45%)`;
}

type DayNightPoint = { x: number; y: number; t: number };
// Punto de gráfico con carril fijo en Y (orden visual por categoría, no por
// peso real) -- el valor real que reemplazó a `y` se guarda en `valorReal`
// para que el tooltip lo siga mostrando. Ver
// Knowledge/29_Specs/007-motor-alimentacion-produccion/.
type DayNightLanePoint = DayNightPoint & { valorReal: number | null };
const LANE_ALIMENTACION = 3;
const LANE_SERVIDO = 2;
const LANE_HIDRATACION = 1;

function aCarril(p: DayNightPoint, lane: number): DayNightLanePoint {
  return { x: p.x, y: lane, t: p.t, valorReal: p.y };
}

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
  // Fallback del motor de Investigacion_v2 (solo KPCL0034, ver
  // Knowledge/29_Specs/007-motor-alimentacion-produccion/) para cuando todavía
  // no hay un evento confirmado por auditoría -- NO reemplaza "Confirmado" (eso
  // sigue siendo exclusivo de audit_events), es un tercer estado honesto entre
  // "sin evidencia" y "confirmado por operador".
  modelMeal?: { at: string; isProvisional: boolean } | null;
}): WellnessState {
  const latestSession =
    [...params.sessions].sort((a, b) => b.endT - a.endT)[0] ?? null;
  if (!latestSession) {
    if (params.type === "food" && params.modelMeal) {
      const { at, isProvisional } = params.modelMeal;
      return {
        stateLabel: isProvisional
          ? "Detectado por modelo (provisorio)"
          : "Detectado por modelo",
        actionLabel:
          "Clasificado automáticamente por el modelo de Investigacion_v2 (KPCL0034) — todavía sin confirmar por un operador.",
        levelLabel: isProvisional ? "Sin confirmar" : "Evento clasificado",
        lastEventLabel: `Última comida detectada por modelo: ${formatTimestamp(at)}${isProvisional ? " (provisoria)" : ""}`,
        hasEvidence: true,
      };
    }
    // Hidratación no tiene (todavía) un modelo de detección calibrado como el
    // Hunger Bar de comida — no hay investigación de hidratación en fase_0_ruido/
    // (ver Knowledge/29_Specs/SPEC_03_Objetivos_Monitoreo.md Pilar 2). Decirlo
    // explícito en vez de "Sin evidencia real" evita que el usuario confunda
    // "tu gato no bebió" con "no sabemos medir esto todavía".
    return {
      stateLabel:
        params.type === "food"
          ? "Sin evidencia real"
          : "Sin modelo de detección todavía",
      actionLabel:
        params.type === "food"
          ? "Solo mostraremos alimentación confirmada con eventos reales."
          : "Mostrando lectura cruda del sensor — sin modelo de detección calibrado todavía para hidratación.",
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

export default function TodayScreen({
  mode = "authed",
  fetchImpl,
  identity = null,
}: TodayScreenProps = {}) {
  const isDemo = mode === "demo";
  // En authed, `doFetch` === `authFetch` (default) -> ruta de código sin cambios.
  // useMemo para que `loadReadings` y los efectos que dependen de él sigan
  // estables (el caller de demo pasa un `fetchImpl` memoizado).
  const doFetch = useMemo<TodayFetch>(
    () => fetchImpl ?? authFetch,
    [fetchImpl],
  );
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
  const [showGuide, setShowGuide] = useState(false);
  const onPetChangeRef = useRef<((e: Event) => void) | null>(null);
  const onDeviceChangeRef = useRef<((e: Event) => void) | null>(null);
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

  // Live readings directo desde HiveMQ WebSocket. El `error` del hook es
  // debugging interno (nombres de env vars, fallos de socket) -- no se muestra
  // al usuario; si no hay lecturas en vivo el gráfico igual se arma desde
  // readings + audit_events.
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
  }, [liveReading, selectedDeviceId]);

  useEffect(() => {
    if (isDemo) {
      // Sin sesión: no se resuelve token ni account type, no se redirige a /admin.
      setIsAuthed(true);
      setAccountType("client");
      return;
    }
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
  }, [router, isDemo]);

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
      const res = await doFetch(`/api/readings?${params.toString()}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar las lecturas.");
      }
      const payload = await res.json();
      return {
        data: parseListResponse<ApiReading>(payload),
        nextCursor: parseCursor(payload),
      };
    },
    [doFetch],
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
          doFetch("/api/pets?limit=20"),
          doFetch("/api/devices?limit=20"),
          doFetch("/api/profiles"),
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
  }, [isAuthed, loadReadings, doFetch]);

  useEffect(() => {
    if (isDemo || !isAuthed || typeof window === "undefined") return;
    const seen = window.localStorage.getItem("kittypau_guide_seen");
    if (!seen) {
      setShowGuide(true);
    }
  }, [isAuthed, isDemo]);

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
      doFetch(`/api/pets/${primaryPet.id}/hunger-bar`)
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
  }, [primaryPet?.id, doFetch]);

  // Semana/mes -- una sola carga al montar (no cada 5 min como el de arriba,
  // ver comentario del tipo). Si falla, se muestra como "sin dato" -- nunca
  // bloquea el resto de la página.
  const [consumoPeriodo, setConsumoPeriodo] =
    useState<ConsumoPeriodoResponse | null>(null);
  useEffect(() => {
    if (!primaryPet?.id) {
      setConsumoPeriodo(null);
      return;
    }
    let cancelled = false;
    doFetch(`/api/pets/${primaryPet.id}/consumo-periodo`)
      .then((res) =>
        res.ok ? (res.json() as Promise<ConsumoPeriodoResponse>) : null,
      )
      .then((data) => {
        if (!cancelled) setConsumoPeriodo(data);
      })
      .catch(() => {
        if (!cancelled) setConsumoPeriodo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [primaryPet?.id, doFetch]);

  // En modo demo la identidad visible es la del visitante (nombre de mascota /
  // dueño / avatar-gif), nunca la real de la mascota de demo (FR-005 / SC-003).
  const ownerLabel =
    isDemo && identity
      ? identity.ownerName
      : state.profile?.owner_name || state.profile?.user_name || "tu";
  const petLabel =
    isDemo && identity ? identity.petName : (primaryPet?.name ?? "tu mascota");

  useHungerBarPushAlert({
    petId: isDemo ? undefined : primaryPet?.id,
    petName: petLabel,
    status: hungerBar?.status,
    estimatedNextMealAt: hungerBar?.estimatedNextMealAt,
  });
  // Aviso positivo (distinto del de atraso de arriba): "comió"/"le sirvieron"
  // en cuanto el motor de Investigacion_v2 confirma un evento nuevo -- ver
  // Knowledge/29_Specs/007-motor-alimentacion-produccion/.
  useHungerBarEventNotifications({
    petName: petLabel,
    events: isDemo ? undefined : hungerBar?.events,
  });
  // Registra el token FCM del celular -- pieza que hace que el aviso de
  // "comió"/"le sirvieron" también llegue con la app cerrada, vía el cron
  // server-side (/api/cron/notify-meal-events). Ver
  // Knowledge/29_Specs/008-push-notifications-fcm/plan.md.
  usePushTokenRegistration(!isDemo && isAuthed === true);
  const petTypeLabel =
    (isDemo && identity ? identity.petType : primaryPet?.type) === "dog"
      ? "Perro"
      : (isDemo && identity ? identity.petType : primaryPet?.type) === "cat"
        ? "Gato"
        : null;
  // Antes se mostraba el valor crudo del enum (ej. "adoptado_refugio", "mediano")
  // pegado con · en una sola línea al lado de la foto, sin decir qué representa cada
  // uno — se truncaba y no se entendía. Ahora cada dato lleva su etiqueta (ver /pet
  // ORIGEN_OPTIONS, mismos labels) y va debajo de la foto con espacio de sobra.
  // ponytail: si un origin es legado (no está en el mapa, ver bug de Bandida en
  // spec 002), se muestra el texto crudo tal cual en vez de "sin datos" — mismo
  // criterio de nunca ocultar un dato ya declarado.
  const ORIGIN_LABELS: Record<string, string> = {
    comprado: "Comprado",
    adoptado_refugio: "Adoptado en refugio",
    rescatado_calle: "Rescatado de la calle",
    regalado: "Regalado / donado",
    nacido_en_casa: "Nació en casa",
    otro: "Otro origen",
  };
  const SIZE_LABELS: Record<string, string> = {
    pequeno: "Pequeño",
    mediano: "Mediano",
    grande: "Grande",
  };
  const AGE_LABELS: Record<string, string> = {
    cachorro: "Cachorro",
    adulto: "Adulto",
    senior: "Senior",
  };
  const petMeta = [
    petTypeLabel ? { label: "Tipo", value: petTypeLabel } : null,
    primaryPet?.origin
      ? {
          label: "Origen",
          value: ORIGIN_LABELS[primaryPet.origin] ?? primaryPet.origin,
        }
      : null,
    primaryPet?.size
      ? {
          label: "Tamaño",
          value: SIZE_LABELS[primaryPet.size] ?? primaryPet.size,
        }
      : null,
    primaryPet?.age_range
      ? {
          label: "Edad",
          value: AGE_LABELS[primaryPet.age_range] ?? primaryPet.age_range,
        }
      : null,
    typeof primaryPet?.weight_kg === "number"
      ? { label: "Peso", value: `${primaryPet.weight_kg} kg` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];
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
    // isFoodDeviceRole reconoce el override de SPEC_08 (device_id específicos cuyo
    // device_type reportado por el firmware no es confiable) antes de caer a
    // clasificar por substring de device_type — ver src/lib/device-role.ts.
    petDevices.find((device) =>
      isFoodDeviceRole(device.device_id, device.device_type),
    ) ??
    petDevices.find(
      (device) =>
        device.device_id?.toUpperCase().includes("KPCL") &&
        !isWaterDeviceRole(device.device_id, device.device_type),
    ) ??
    primaryDevice;
  const baseWaterDevice =
    petDevices.find(
      (device) =>
        (device.device_id ?? "").toUpperCase() === expectedWaterDeviceCode,
    ) ??
    petDevices.find((device) => {
      const id = (device.device_id ?? "").toUpperCase();
      return (
        isWaterDeviceRole(device.device_id, device.device_type) ||
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
            const res = await doFetch(
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
  }, [bowlDevice?.id, waterDevice?.id, dayCycleOffsetDays, doFetch]);

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
  const bowlPlateWeightEffective = bowlPlateWeightGrams;
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
  const bowlContentWeightGrams = bowlRawContentWeightGrams;
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
  const waterPlateWeightEffective = waterPlateWeightGrams;
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
  const waterContentWeightGrams = waterRawContentWeightGrams;
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
      return Math.max(0, base);
    },
    [bowlPlateWeightEffective],
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
      return Math.max(0, base);
    },
    [waterPlateWeightEffective],
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

  // Separar el plato en "solo alimentación real" vs. "servido", usando el
  // modelo de Investigacion_v2 (solo KPCL0034, ver
  // Knowledge/29_Specs/007-motor-alimentacion-produccion/) -- fuera de ese
  // device (ej. KPCL0035, sin validar) se muestra el trazo crudo como hasta
  // ahora, sin distinguir categoría.
  const bowlEventsPorCategoria = useMemo(() => {
    if (
      !isAuthoritativeFoodDeviceCode(bowlDevice?.device_id) ||
      !hungerBar?.events
    ) {
      return null;
    }
    return hungerBar.events;
  }, [bowlDevice?.device_id, hungerBar?.events]);

  // Un ícono por EVENTO, ubicado con la hora del PROPIO evento (`startAt`),
  // no buscando "la lectura cruda más cercana" -- eso fue un bug real: los
  // eventos de `hungerBar.events` vienen de una ventana de 10 días, pero
  // `bowlDayNightPoints` solo tiene lecturas del día que se está viendo. Si
  // ese día no traía lecturas justo ahí (fetch/ventana distinta al de
  // hunger-bar), el evento no encontraba dónde pintarse o se enganchaba al
  // punto más cercano disponible aunque fuera de otra hora, amontonando
  // íconos mal ubicados. Igual que `toDayNightPoints`, se descarta el evento
  // si su hora cae fuera de la ventana del día actual. `valorReal` sale
  // directo de `deltaG` del propio evento (el peso que YA calculó el
  // clasificador), no de una lectura aproximada.
  const puntosPorCategoria = useMemo(() => {
    const resultado: {
      alimentacion: DayNightLanePoint[];
      servido: DayNightLanePoint[];
    } = { alimentacion: [], servido: [] };
    if (!bowlEventsPorCategoria) return resultado;
    for (const ev of bowlEventsPorCategoria) {
      if (ev.category !== "alimentacion" && ev.category !== "servido") continue;
      const ts = new Date(ev.startAt).getTime();
      if (
        Number.isNaN(ts) ||
        ts < dayNightWindow.startMs ||
        ts > dayNightWindow.endMs
      ) {
        continue;
      }
      const lane =
        ev.category === "alimentacion" ? LANE_ALIMENTACION : LANE_SERVIDO;
      resultado[ev.category].push({
        x: (ts - dayNightWindow.startMs) / (60 * 60 * 1000),
        y: lane,
        t: ts,
        valorReal: ev.deltaG,
      });
    }
    return resultado;
  }, [bowlEventsPorCategoria, dayNightWindow.startMs, dayNightWindow.endMs]);

  const bowlAlimentacionPoints = useMemo(() => {
    // sin modelo (device no validado): trazo crudo tal cual, sin carril fijo
    if (!bowlEventsPorCategoria) return bowlDayNightPoints;
    return puntosPorCategoria.alimentacion;
  }, [bowlDayNightPoints, bowlEventsPorCategoria, puntosPorCategoria]);

  const bowlServidoPoints = useMemo(() => {
    if (!bowlEventsPorCategoria) return [];
    return puntosPorCategoria.servido;
  }, [bowlEventsPorCategoria, puntosPorCategoria]);

  // Hidratación no tiene modelo (ver spec) -- se mantienen todas las lecturas
  // crudas, solo se les fija el carril para que el eje Y deje de importar acá
  // también (pedido explícito: los 3 platos ordenados por carril, no por peso).
  const waterLanePoints = useMemo(
    () => waterDayNightPoints.map((p) => aCarril(p, LANE_HIDRATACION)),
    [waterDayNightPoints],
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
    const img = new window.Image(64, 64);
    img.src = "/illustrations/pink_food_full.png";
    return img;
  }, []);

  // Ícono de Servido en el gráfico -- mismo asset que ya usa el widget "Comida"
  // de Barras Sims, sin encargar uno nuevo (ver
  // Knowledge/29_Specs/007-motor-alimentacion-produccion/).
  const servidoPointStyle = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const img = new window.Image(64, 64);
    img.src = "/illustrations/icono_comida.png";
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
          data: bowlAlimentacionPoints,
          showLine: false,
          pointStyle: foodPointStyle,
          pointRadius: 13,
          pointHoverRadius: 14,
          pointHoverBorderWidth: 2,
          pointBackgroundColor: "#ec4899",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
        },
        {
          // Servido (plato rellenado) -- ícono distinto al de alimentación real,
          // solo poblado para KPCL0034 (ver
          // Knowledge/29_Specs/007-motor-alimentacion-produccion/).
          label: `Servido (${bowlDevice?.device_id ?? "KPCL"})`,
          data: bowlServidoPoints,
          showLine: false,
          pointStyle: servidoPointStyle,
          pointRadius: 13,
          pointHoverRadius: 14,
          pointHoverBorderWidth: 2,
          pointBackgroundColor: "#6366f1",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
        },
        {
          // Sin modelo de detección de "trago" (hidratación no tiene evento
          // discreto, ver Knowledge/05_API/SPEC_HungerBar_Alimentacion.md) --
          // acá SÍ es 1 lectura cruda cada ~30-60s, no 1 evento. Un ícono de
          // 64px por lectura se amontonaba en un embarrado ilegible sobre un
          // día completo. Trazo fino y continuo en vez de íconos grandes --
          // representa lo que realmente es: una señal seguida, no eventos
          // puntuales como Comida/Servido.
          label: `Hidratación (${waterDevice?.device_id ?? "KPCL"})`,
          data: waterLanePoints,
          showLine: true,
          borderColor: "rgba(20,184,166,0.55)",
          borderWidth: 1.5,
          pointStyle: "circle",
          pointRadius: 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 2,
          pointBackgroundColor: "#14b8a6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1,
          tension: 0,
        },
      ],
    }),
    [
      bowlAlimentacionPoints,
      bowlServidoPoints,
      bowlDevice?.device_id,
      foodPointStyle,
      servidoPointStyle,
      waterLanePoints,
      waterDevice?.device_id,
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
            // Los datasets usan una Image (64px) como pointStyle para los puntos
            // del gráfico. Chart.js ignora boxWidth/boxHeight con pointStyle de
            // imagen en la leyenda y la dibuja gigante tapando su texto. Forzar
            // un círculo chico solo en la leyenda (el color viene de
            // pointBackgroundColor de cada serie); los puntos del gráfico no se
            // tocan.
            pointStyle: "circle",
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
              // El eje Y ahora es un carril fijo por categoría (no el peso
              // real) -- el peso/volumen real viaja en `valorReal` cuando el
              // punto lo trae (ver DayNightLanePoint); si no, cae a parsed.y
              // (trazo crudo sin carril, ej. device sin modelo validado).
              const raw = context.raw as { valorReal?: number } | undefined;
              const value =
                typeof raw?.valorReal === "number"
                  ? Math.round(raw.valorReal)
                  : typeof context.parsed.y === "number"
                    ? Math.round(context.parsed.y)
                    : null;
              const label = String(context.dataset.label ?? "Serie");
              const seriesTitle = label.includes("Hidratación")
                ? "Hidratación"
                : label.includes("Servido")
                  ? "Servido"
                  : label.includes("Alimentación")
                    ? "Alimentación"
                    : "Lectura";
              const isHydration = label.includes("Hidratación");
              const unit = isHydration ? "cm3 (aprox)" : "g";
              const valueText = value === null ? "N/D" : `${value} ${unit}`;
              return [`${seriesTitle}: ${valueText}`];
            },
            afterLabel: (context) => {
              // Pedido explícito: al pasar el mouse sobre el plato
              // (Alimentación/Servido) el tooltip debe decir ÚNICAMENTE la
              // hora (ya la da `title`) y cuánto comió (ya lo da `label`) --
              // sin líneas extra de auditoría ni de cross-referencia del
              // modelo. Hidratación (el bebedero, no "el plato") conserva su
              // detalle de sesión auditada.
              const label = String(context.dataset.label ?? "Serie");
              const isHydration = label.includes("Hidratación");
              if (!isHydration) return [];

              const session = findSessionForPoint(
                waterIntakeSessions,
                context.dataIndex,
              );
              if (!session) return ["Sin evento registrado"];
              const auditEvents =
                deviceAuditEvents[waterDevice?.id ?? ""] ?? [];
              const isConfirmed = auditEvents.some(
                (e) =>
                  e.category === WATER_START_CATEGORY &&
                  Math.abs(new Date(e.created_at).getTime() - session.startT) <
                    5 * 60 * 1000,
              );
              return [
                isConfirmed
                  ? "✓ Hidratación confirmada"
                  : "Hidratación detectada",
                `Inicio: ${formatSessionClock(session.startT)}`,
                `Fin: ${formatSessionClock(session.endT)}`,
                `Duración: ${formatSessionDuration(session.durationMinutes)}`,
                `Consumo: ${Math.round(session.consumed)} cm3 (aprox)`,
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
          // Carriles fijos por categoría (LANE_ALIMENTACION=3/SERVIDO=2/
          // HIDRATACION=1), no peso real -- min/max con margen para que los
          // íconos de los carriles extremos no queden pegados al borde.
          min: 0,
          max: 4,
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
    [dayNightWindow.startMs, waterIntakeSessions],
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
          return Math.max(0, base);
        },
      ),
    [
      bowlDevice?.id,
      bowlPlateWeightEffective,
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
          return Math.max(0, base);
        },
      ),
    [
      waterDevice?.id,
      waterPlateWeightEffective,
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
  const bowlModelMeal = useMemo(() => {
    if (!isAuthoritativeFoodDeviceCode(bowlDevice?.device_id)) return null;
    if (
      !hungerBar ||
      hungerBar.status !== "ok" ||
      !hungerBar.lastMealDetectedAt
    )
      return null;
    return {
      at: hungerBar.lastMealDetectedAt,
      isProvisional: hungerBar.lastMealIsProvisional ?? false,
    };
  }, [bowlDevice?.device_id, hungerBar]);
  const bowlWellness = useMemo(
    () =>
      buildWellnessState({
        type: "food",
        sessions: bowlHistorySessions,
        modelMeal: bowlModelMeal,
      }),
    [bowlHistorySessions, bowlModelMeal],
  );
  const waterWellness = useMemo(
    () =>
      buildWellnessState({
        type: "water",
        sessions: waterHistorySessions,
      }),
    [waterHistorySessions],
  );

  // Diagnóstico rápido (SPEC_02 U2) — mismo patrón de /bowl, generalizado.
  const bowlDiagnostics = useMemo(() => {
    const batteryLevel = bowlDevice?.battery_level ?? null;
    const lastSeen = bowlDevice?.last_seen ?? null;
    return {
      connectionHint: getConnectionHint(lastSeen),
      actionNotes: getActionNotes({ batteryLevel, lastSeen }),
      ...getBatterySummary({
        level: batteryLevel,
        voltage: bowlDevice?.battery_voltage ?? null,
        source: bowlDevice?.battery_source ?? null,
        isEstimated: bowlDevice?.battery_is_estimated ?? false,
      }),
    };
  }, [
    bowlDevice?.battery_level,
    bowlDevice?.last_seen,
    bowlDevice?.battery_voltage,
    bowlDevice?.battery_source,
    bowlDevice?.battery_is_estimated,
  ]);
  const waterDiagnostics = useMemo(() => {
    const batteryLevel = waterDevice?.battery_level ?? null;
    const lastSeen = waterDevice?.last_seen ?? null;
    return {
      connectionHint: getConnectionHint(lastSeen),
      actionNotes: getActionNotes({ batteryLevel, lastSeen }),
      ...getBatterySummary({
        level: batteryLevel,
        voltage: waterDevice?.battery_voltage ?? null,
        source: waterDevice?.battery_source ?? null,
        isEstimated: waterDevice?.battery_is_estimated ?? false,
      }),
    };
  }, [
    waterDevice?.battery_level,
    waterDevice?.last_seen,
    waterDevice?.battery_voltage,
    waterDevice?.battery_source,
    waterDevice?.battery_is_estimated,
  ]);

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

  // Separado en 2 cuadros (pedido de Mauro 2026-09-09): "última comida" (+
  // la barra de comió-más-o-menos) en uno, "próxima estimada" en el otro --
  // antes era un solo string con \n en un solo cuadro.
  const hungerLastMealLabel = useMemo(() => {
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
    if (!hungerBar.lastMealDetectedAt)
      return "Última comida confirmada: sin registro";
    return `Última comida: ${formatTimestamp(hungerBar.lastMealDetectedAt)}${hungerBar.lastMealIsProvisional ? " (provisoria)" : ""}`;
  }, [hungerBar]);

  const hungerNextMealLabel = useMemo(() => {
    if (
      !hungerBar ||
      hungerBar.status !== "ok" ||
      hungerBar.percentage === null ||
      hungerBar.alertActive ||
      hungerBar.percentage <= 0 ||
      !hungerBar.estimatedNextMealAt
    ) {
      return null; // ya se dijo todo lo que hay que decir en el cuadro de "última comida"
    }
    return `Próxima comida estimada: ${formatTimestamp(hungerBar.estimatedNextMealAt)}`;
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
        {!isDemo &&
          accountType === "client" &&
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
        {/* No es <header> semántico: agrupa todo el feed de /today (hero +
            bowls + diagnóstico + chart + consumo), no solo la identidad de
            la mascota — corregido, antes decía <header> por error. */}
        <div className="flex flex-col gap-4">
          {/* "Topbar" de la estructura pedida por Mauro (2026-09-11) --
              mismo dato que antes vivía metido en el aside del hero, ahora
              es su propia línea arriba de todo. Sin wordmark nuevo: el nav
              ya dice "Kittypau" arriba de la página, repetirlo acá sería
              ruido de marca, no jerarquía. */}
          <p className="text-center text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Actualizado el {heroUpdatedLabel}
          </p>

          <section
            id="today-hero"
            role="region"
            aria-label="Hero de mascota"
            className="today-hero surface-card freeform-rise border-t-4 border-t-primary px-4 py-3 md:px-6 md:py-3"
          >
            <div className="flex min-w-0 flex-col items-center gap-2">
              <div className="relative">
                {(() => {
                  const heroPhoto = (
                    <Image
                      src={
                        isDemo && identity
                          ? identity.avatarSrc
                          : primaryPet?.photo_url || "/pet_profile.jpeg"
                      }
                      alt={`Foto de ${petLabel}`}
                      width={160}
                      height={160}
                      unoptimized
                      className="h-32 w-32 rounded-full border border-slate-200 object-cover"
                    />
                  );
                  // En demo la foto no es un link (/pet es ruta con sesión).
                  return isDemo ? (
                    <span className="inline-flex">{heroPhoto}</span>
                  ) : (
                    <Link
                      href="/pet"
                      className="inline-flex"
                      title="Ajustar foto"
                      aria-label="Ajustar foto"
                    >
                      {heroPhoto}
                    </Link>
                  );
                })()}
                {/* 3 badges sobre el retrato (pedido de Mauro 2026-09-11) --
                    ningún dato nuevo, todo ya se calcula más arriba en el
                    componente. Racha y comidas hoy solo existen para
                    KPCL0034 (el único dispositivo con motor de clasificación
                    validado); el de agua es deliberadamente sin número --
                    todavía no hay modelo de detección de trago confirmado
                    (ver Knowledge/05_API/SPEC_HungerBar_Alimentacion.md), así
                    que mostrar una cifra ahí sería inventar un dato. */}
                {hungerBar?.kpis ? (
                  <span
                    className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-base font-bold text-primary-foreground shadow-sm"
                    title="Racha de días seguidos comiendo"
                    aria-label={`Racha: ${hungerBar.kpis.streakDays} días seguidos comiendo`}
                  >
                    {hungerBar.kpis.streakDays}
                  </span>
                ) : null}
                {hungerBar?.kpis ? (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-9 w-9 items-center justify-center gap-0.5 rounded-full border-2 border-white bg-emerald-500 text-base font-bold text-white shadow-sm"
                    title="Comidas de hoy"
                    aria-label={`Comidas de hoy: ${hungerBar.kpis.mealsToday}`}
                  >
                    <Image
                      src="/illustrations/icono_comida.png"
                      alt=""
                      aria-hidden={true}
                      width={14}
                      height={14}
                      className="object-contain"
                    />
                    {hungerBar.kpis.mealsToday}
                  </span>
                ) : null}
                {hasWaterDevice ? (
                  <span
                    className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-sky-300 bg-white shadow-sm"
                    title="Hidratación: sin modelo de detección de trago confirmado todavía"
                    aria-label="Hidratación: sin conteo confirmado todavía"
                  >
                    <Image
                      src="/illustrations/icono_agua.png"
                      alt=""
                      aria-hidden={true}
                      width={13}
                      height={13}
                      className="object-contain opacity-70"
                    />
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {!isDemo ? (
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
                ) : null}
                <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">
                  {petLabel}
                </h2>
                {!isDemo ? (
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
                ) : null}
              </div>
              {/* Debajo de la foto, con etiqueta ("Origen: Adoptado en refugio")
                  en vez de valores crudos pegados con · (se truncaba y no decía
                  qué era cada dato — corregido 2026-08-17). */}
              <div className="flex flex-col items-center gap-1 text-center text-xs text-slate-500 md:text-sm">
                {petMeta.length ? (
                  petMeta.map((item) => (
                    <span key={item.label}>
                      {item.label}:{" "}
                      <span className="font-medium text-slate-700">
                        {item.value}
                      </span>
                    </span>
                  ))
                ) : (
                  <span>Sin datos de registro</span>
                )}
              </div>
            </div>
          </section>

          {/* "Frame: Resources" de la estructura enviada -- Barras Sims pasa
              de vivir metido en un aside angosto al lado de la foto a ser su
              propia sección, ancho completo, mismo nivel que Bowls/Timeline/
              Consumo. Mismo componente, mismos props, mismos datos. */}
          <section
            aria-label="Estado de recursos"
            className="mx-auto w-full max-w-md"
          >
            <BarrasSimsCard
              deviceId={bowlDevice?.device_id}
              powerState={bowlPowerState}
              batteryState={bowlDevice?.battery_state}
              batteryLevel={bowlDevice?.battery_level}
              bars={[
                {
                  key: "food",
                  title: "Comida",
                  iconSrc: "/illustrations/icono_comida.png",
                  filledBlocks: hungerFilledBlocks,
                  valueLabel: hungerValueLabel,
                  statusLabel: hungerStatusLabel,
                  noteLabel: hungerLastMealLabel,
                  noteLabelSecondary: hungerNextMealLabel,
                  mealSizeGramos: hungerBar?.lastMealGramos ?? null,
                  // Verde = mismo color de "Alimentación" en #today-bowls (antes
                  // rosa acá, verde allá — mismo concepto, 2 colores distintos).
                  // El rojo de alerta se mantiene: es estado (atrasada), no marca.
                  trackClass: hungerBar?.alertActive
                    ? "border-2 border-rose-500 bg-rose-50 animate-pulse"
                    : "border-emerald-100 bg-emerald-50",
                  fillClass: "",
                  fillStyle: hungerFillColor
                    ? { backgroundColor: hungerFillColor }
                    : undefined,
                  labelClass: "text-emerald-700",
                  badgeClass: hungerBar?.alertActive
                    ? "border-rose-300 bg-rose-100 text-rose-800"
                    : "border-emerald-100 bg-emerald-50 text-emerald-700",
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
                  // Celeste = mismo color de "Hidratación" en #today-bowls.
                  trackClass: "border-sky-100 bg-sky-50",
                  fillClass:
                    "bg-[linear-gradient(180deg,rgba(56,189,248,0.95)_0%,rgba(2,132,199,0.95)_100%)]",
                  fillStyle: undefined,
                  labelClass: "text-sky-700",
                  badgeClass: "border-sky-100 bg-sky-50 text-sky-700",
                },
              ]}
            />
          </section>

          <section
            id="today-bowls"
            role="region"
            aria-label="Estado de platos"
            className="surface-card freeform-rise px-4 py-4 md:px-6 md:py-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <BowlWellnessCard
                  kind="food"
                  hasDevice={hasFoodDevice}
                  device={bowlDevice}
                  latestReading={bowlLatestReading}
                  powerState={bowlPowerState}
                  wellness={bowlWellness}
                  contentValueText={bowlContentWeightText}
                  contentWeightGrams={bowlContentWeightGrams}
                  prevContentWeightGrams={bowlPrevContentWeightGrams}
                  maxReferenceGrams={bowlMaxServedContentGrams}
                  tempText={bowlTempText}
                  humidityText={bowlHumidityText}
                  formatTimestamp={formatTimestamp}
                />
              </div>

              <div className="flex flex-col gap-2">
                <BowlWellnessCard
                  kind="water"
                  hasDevice={hasWaterDevice}
                  device={waterDevice}
                  latestReading={waterLatestReading}
                  powerState={waterPowerState}
                  wellness={waterWellness}
                  contentValueText={waterVolumeMlText}
                  contentWeightGrams={waterContentWeightGrams}
                  prevContentWeightGrams={waterPrevContentWeightGrams}
                  maxReferenceGrams={waterMaxServedContentMl}
                  tempText={waterTempText}
                  humidityText={waterHumidityText}
                  formatTimestamp={formatTimestamp}
                />
              </div>
            </div>
          </section>

          {/* HUD compacto en vez del DiagnosticoRapidoCard compartido
              (3 columnas + lista de acciones en prosa) -- ese componente lo
              usan /bowl y /pet también, así que este es uno propio de
              /today, inline, solo acá. Principio de HUD real (investigado
              2026-09-11): info crítica en 1 línea con ícono+color, no
              párrafos -- "fast access to critical data", no un ensayo. */}
          {hasFoodDevice || hasWaterDevice ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {hasFoodDevice ? (
                <div className="flex flex-col gap-1 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                        bowlPowerState === "on"
                          ? "bg-emerald-500"
                          : bowlPowerState === "off"
                            ? "bg-amber-500"
                            : "bg-slate-300"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-emerald-700">
                      Comedero
                    </span>
                    <span className="ml-auto text-[11px] text-slate-500">
                      {bowlDiagnostics.connectionHint}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Batería {bowlDiagnostics.summary}
                    {bowlDiagnostics.extra ? ` (${bowlDiagnostics.extra})` : ""}
                    {bowlDiagnostics.actionNotes[0]
                      ? ` · ${bowlDiagnostics.actionNotes[0]}`
                      : ""}
                  </p>
                </div>
              ) : null}
              {hasWaterDevice ? (
                <div className="flex flex-col gap-1 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                        waterPowerState === "on"
                          ? "bg-sky-500"
                          : waterPowerState === "off"
                            ? "bg-amber-500"
                            : "bg-slate-300"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-sky-700">
                      Bebedero
                    </span>
                    <span className="ml-auto text-[11px] text-slate-500">
                      {waterDiagnostics.connectionHint}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Batería {waterDiagnostics.summary}
                    {waterDiagnostics.extra
                      ? ` (${waterDiagnostics.extra})`
                      : ""}
                    {waterDiagnostics.actionNotes[0]
                      ? ` · ${waterDiagnostics.actionNotes[0]}`
                      : ""}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <DayNightTimelineCard
            dayCycleOffsetDays={dayCycleOffsetDays}
            onOffsetChange={setDayCycleOffsetDays}
            rangeTitle={dayNightRangeTitle}
            chartData={dayNightChartData}
            chartOptions={dayNightChartOptions}
            backgroundPlugin={dayNightBackgroundPlugin}
            chartLoadError={chartLoadError}
            isAuthoritativeFoodDevice={isAuthoritativeFoodDevice}
            authoritativeDeviceCode={AUTHORITATIVE_FOOD_DEVICE_CODE}
          />

          {/* Antes 2 cards blancas idénticas apiladas (mismo borde/sombra
              verde, se leían como bloques repetidos sin relación visible).
              Un solo contenedor conectado, sin doble sombra — cada card
              sigue pudiendo ser null de forma independiente. */}
          {hungerBar?.kpis || consumoPeriodo?.status === "ok" ? (
            <div className="divide-y divide-emerald-100 overflow-hidden rounded-[calc(var(--radius)-8px)] border border-emerald-100 shadow-[0_10px_28px_-22px_rgba(16,185,129,0.5)]">
              <ConsumoKpisCard kpis={hungerBar?.kpis ?? null} />
              <ConsumoPeriodoCard data={consumoPeriodo} />
            </div>
          ) : null}

          {/* "Foot-note" de la estructura enviada. */}
          <p className="text-center text-[11px] text-slate-400">
            Datos en vivo de {bowlDevice?.device_id ?? "KPCL0034"} (comida) y{" "}
            {waterDevice?.device_id ?? "KPCL0035"} (agua).
          </p>
        </div>

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
        <OnboardingGuideModal
          petLabel={petLabel}
          ownerLabel={ownerLabel}
          onClose={() => setShowGuide(false)}
        />
      ) : null}
      {!isDemo ? <QaTestMealNotification petName={petLabel} /> : null}
    </div>
  );
}
