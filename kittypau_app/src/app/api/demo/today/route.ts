import { NextRequest, NextResponse } from "next/server";
import { apiError, logRequestEnd, startRequestTimer } from "../../_utils";
import { checkRateLimit, getRateKeyFromRequest } from "../../_rate-limit";
import { supabaseServer } from "@/lib/supabase/server";
import { getDemoDeviceCodes } from "@/lib/demo/demo-config";
import {
  buildConsumoPeriodoPayload,
  buildHungerBarPayload,
} from "@/lib/hunger-bar-server";

// GET /api/demo/today  --  Knowledge/29_Specs/009-demo-today-en-vivo
//
// Bundle público (SIN sesión, SOLO lectura) con todo lo que <TodayScreen>
// necesita del servidor para espejar `/today` de la mascota de demo. Los
// sub-shapes `hungerBar` / `consumoPeriodo` salen de las MISMAS funciones que
// usan las rutas autenticadas (`@/lib/hunger-bar-server`) -> sin drift
// (FR-016 / SC-008).
//
// Seguridad (FR-012 / SC-005): el endpoint SOLO conoce los códigos KPCL de
// `getDemoDeviceCodes()` (env). No acepta parámetros. Nunca devuelve el uuid
// interno de los devices, `pet_id`, `pet_name`, `user_id` ni datos de ningún
// otro dispositivo/cuenta.

const READINGS_WINDOW_DAYS = 3; // suficiente para el gráfico día/noche + "última lectura"
const READINGS_LIMIT = 2000;
const AUDIT_WINDOW_DAYS = 180; // mismo lookback que el efecto de audit_events de /today
const AUDIT_LIMIT = 2000;

const TODAY_AUDIT_CATEGORIES = new Set([
  "inicio_servido",
  "termino_servido",
  "inicio_alimentacion",
  "termino_alimentacion",
  "inicio_hidratacion",
  "termino_hidratacion",
]);

const NEUTRAL_HUNGER_BAR = {
  status: "sin_dispositivo" as const,
  percentage: null,
  lastMealDetectedAt: null,
  lastMealConfidence: null,
  lastMealIsProvisional: false,
  lastMealGramos: null,
  estimatedNextMealAt: null,
  intervalUsedMinutes: null,
  usingFallback: false,
  sampleSize: 0,
  alertActive: false,
  hoursOverdue: null,
  events: [] as unknown[],
  kpis: null,
};

type DeviceRow = {
  id: string;
  pet_id: string | null;
  device_id: string;
  device_type: string | null;
  plate_weight_grams: number | null;
  status: string | null;
  device_state: string | null;
  battery_level: number | null;
  battery_state: string | null;
  battery_voltage: number | null;
  battery_source: string | null;
  battery_is_estimated: boolean | null;
  last_seen: string | null;
};

const DEVICE_COLUMNS =
  "id, pet_id, device_id, device_type, plate_weight_grams, status, device_state, battery_level, battery_state, battery_voltage, battery_source, battery_is_estimated, last_seen";

/** Device sin identidad de cuenta -- el `id` sintético es el propio código KPCL. */
function stripDevice(d: DeviceRow) {
  return {
    id: d.device_id,
    pet_id: "demo-pet",
    device_id: d.device_id,
    device_type: d.device_type,
    plate_weight_grams: d.plate_weight_grams,
    status: d.status,
    device_state: d.device_state,
    battery_level: d.battery_level,
    battery_state: d.battery_state,
    battery_voltage: d.battery_voltage,
    battery_source: d.battery_source,
    battery_is_estimated: d.battery_is_estimated,
    last_seen: d.last_seen,
  };
}

function categoryType(
  category: string,
): "alimentacion" | "servido" | "hidratacion" | null {
  const suffix = category.split("_")[1] ?? "";
  if (
    suffix === "alimentacion" ||
    suffix === "servido" ||
    suffix === "hidratacion"
  ) {
    return suffix;
  }
  return null;
}

async function readingsForDevice(deviceUuid: string, code: string) {
  const sinceIso = new Date(
    Date.now() - READINGS_WINDOW_DAYS * 86_400_000,
  ).toISOString();
  const { data } = await supabaseServer
    .from("readings")
    .select(
      "id, recorded_at, weight_grams, water_ml, flow_rate, temperature, humidity, light_percent, battery_level",
    )
    .eq("device_id", deviceUuid)
    .gte("recorded_at", sinceIso)
    .order("recorded_at", { ascending: false })
    .limit(READINGS_LIMIT);
  // `device_id` remapeado al código KPCL para que matchee el `id` sintético
  // del device en el bundle (el uuid real no se expone).
  return (data ?? []).map((r) => ({ ...r, device_id: code }));
}

async function auditEventsForDevice(deviceUuid: string) {
  const sinceIso = new Date(
    Date.now() - AUDIT_WINDOW_DAYS * 86_400_000,
  ).toISOString();
  const { data } = await supabaseServer
    .from("audit_events")
    .select("id, created_at, payload")
    .eq("entity_type", "device")
    .eq("entity_id", deviceUuid)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(AUDIT_LIMIT);
  return (data ?? [])
    .map((row) => {
      const payload = (row.payload ?? {}) as {
        category?: string;
        category_label?: string;
        snapshot?: unknown;
      };
      const category = payload.category ?? null;
      if (!category || !TODAY_AUDIT_CATEGORIES.has(category)) return null;
      return {
        id: row.id,
        created_at: row.created_at,
        category,
        category_label: payload.category_label ?? category,
        category_type: categoryType(category),
        snapshot: payload.snapshot ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);

  const rate = await checkRateLimit(
    `${getRateKeyFromRequest(req)}:demo-today`,
    30,
    5 * 60_000,
  );
  if (!rate.ok) {
    logRequestEnd(req, startedAt, 429);
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  const { food: foodCode, water: waterCode } = getDemoDeviceCodes();

  let devRows: DeviceRow[] = [];
  try {
    const { data, error } = await supabaseServer
      .from("devices")
      .select(DEVICE_COLUMNS)
      .in("device_id", [foodCode, waterCode])
      .order("last_seen", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    devRows = (data ?? []) as DeviceRow[];
  } catch (err) {
    // No se pudo ni resolver los devices -- respuesta degradada (FR-008).
    logRequestEnd(req, startedAt, 200, {
      demo: "devices_error",
      msg: err instanceof Error ? err.message : String(err),
    });
    return degraded([]);
  }

  const pickByCode = (code: string) =>
    devRows.find((d) => (d.device_id ?? "").toUpperCase() === code) ?? null;
  const foodDevice = pickByCode(foodCode);
  const waterDevice = pickByCode(waterCode);

  const devices = [foodDevice, waterDevice]
    .filter((d): d is DeviceRow => d !== null)
    .map(stripDevice);

  if (!foodDevice) {
    logRequestEnd(req, startedAt, 200, { demo: "no_food_device" });
    return degraded(devices);
  }

  // Datos por dispositivo + payloads compartidos con las rutas autenticadas.
  let hungerBar: unknown = NEUTRAL_HUNGER_BAR;
  let consumoPeriodo: unknown = { status: "sin_dispositivo" };
  let readings: unknown[] = [];
  const auditEvents: Record<string, unknown[]> = {};

  try {
    const petRow = foodDevice.pet_id
      ? (
          await supabaseServer
            .from("pets")
            .select("food_normal_min_g, food_normal_max_g")
            .eq("id", foodDevice.pet_id)
            .single()
        ).data
      : null;

    const foodRef = { id: foodDevice.id, device_id: foodDevice.device_id };

    const [hb, cp, foodReadings, waterReadings, foodEvents, waterEvents] =
      await Promise.all([
        buildHungerBarPayload(foodRef, petRow ?? {}),
        buildConsumoPeriodoPayload(foodRef),
        readingsForDevice(foodDevice.id, foodDevice.device_id),
        waterDevice
          ? readingsForDevice(waterDevice.id, waterDevice.device_id)
          : Promise.resolve([]),
        auditEventsForDevice(foodDevice.id),
        waterDevice
          ? auditEventsForDevice(waterDevice.id)
          : Promise.resolve([]),
      ]);

    hungerBar = hb;
    // `diasConDatosVentana` es diagnóstico -- fuera del JSON HTTP.
    const { diasConDatosVentana, ...cpBody } = cp;
    void diasConDatosVentana;
    consumoPeriodo = cpBody;
    readings = [...foodReadings, ...waterReadings];
    auditEvents[foodDevice.device_id] = foodEvents;
    if (waterDevice) auditEvents[waterDevice.device_id] = waterEvents;
  } catch (err) {
    // Cómputo caído -- se sirve lo neutro con los devices que sí hay (FR-008).
    logRequestEnd(req, startedAt, 200, {
      demo: "compute_error",
      msg: err instanceof Error ? err.message : String(err),
    });
    return degraded(devices);
  }

  logRequestEnd(req, startedAt, 200, {
    demo: "ok",
    devices: devices.length,
    readings: readings.length,
  });
  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      devices,
      readings,
      auditEvents,
      hungerBar,
      consumoPeriodo,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}

/** Respuesta 200 degradada -- mismos estados neutros que `/today` real. */
function degraded(devices: ReturnType<typeof stripDevice>[]) {
  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      devices,
      readings: [],
      auditEvents: {},
      hungerBar: NEUTRAL_HUNGER_BAR,
      consumoPeriodo: { status: "sin_dispositivo" },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
      },
    },
  );
}
