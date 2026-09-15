import { supabaseServer } from "@/lib/supabase/server";
import { computeHungerBar, type ReadingPoint } from "@/lib/hunger-bar";
import { isFoodDeviceRole, isWaterDeviceRole } from "@/lib/device-role";
import { computeConsumoKpis } from "@/lib/consumo-kpis";
import { chileDateString } from "@/lib/time/chile";

/**
 * Parte server-only de `GET /api/pets/:id/hunger-bar` (resolver el comedero
 * activo + traer `readings` + `computeHungerBar`) extraída para reusarla
 * también desde el cron de push (`/api/cron/notify-meal-events`) sin
 * duplicar la paginación ni la lógica de desambiguación de dispositivo.
 * Mismo comportamiento exacto, cero cambios de lógica -- solo movido.
 */

const WINDOW_DAYS = 10; // suficiente para varias comidas + mediana propia; ver N_MIN_MUESTRAS
// ponytail: Supabase/PostgREST cappea CADA request a un máximo del lado del
// servidor (medido: 1000 filas, `db-max-rows`) sin importar qué .range() se
// pida — paginar por el tamaño de página REAL devuelto, no asumir 1 página
// alcanza (ver hunger-bar/route.ts, bug encontrado 2026-08-11).
const PAGE_SIZE = 1000;
const MAX_PAGES = 60; // ~60k filas tope de seguridad

export type FoodDevice = { id: string; device_id: string };

export async function resolveFoodDevice(
  petId: string,
): Promise<FoodDevice | null> {
  const { data: candidateDevices, error } = await supabaseServer
    .from("devices")
    .select("id, device_id, device_type, last_seen")
    .eq("pet_id", petId)
    .eq("status", "active")
    .order("last_seen", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  const device =
    (candidateDevices ?? []).find((d) =>
      isFoodDeviceRole(d.device_id, d.device_type),
    ) ?? null;
  return device ? { id: device.id, device_id: device.device_id } : null;
}

export type WaterDevice = {
  id: string;
  device_id: string;
  plate_weight_grams: number | null;
};

/**
 * Resuelve el bebedero activo de la mascota -- mismo criterio que ya usa
 * `today-screen.tsx` client-side (`waterDevice`): primero por rol real
 * (`isWaterDeviceRole`, ver `@/lib/device-role`), si no hay ninguno cae a
 * cualquier otro dispositivo activo de la mascota que no sea el comedero.
 */
export async function resolveWaterDevice(
  petId: string,
  foodDeviceId?: string | null,
): Promise<WaterDevice | null> {
  const { data: candidateDevices, error } = await supabaseServer
    .from("devices")
    .select("id, device_id, device_type, plate_weight_grams, last_seen")
    .eq("pet_id", petId)
    .eq("status", "active")
    .order("last_seen", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  const devices = candidateDevices ?? [];
  const water =
    devices.find((d) => isWaterDeviceRole(d.device_id, d.device_type)) ??
    devices.find((d) => d.id !== foodDeviceId) ??
    null;
  return water
    ? {
        id: water.id,
        device_id: water.device_id,
        plate_weight_grams: water.plate_weight_grams,
      }
    : null;
}

type AuditEventRow = {
  created_at: string;
  category: string;
  snapshot: {
    weight_grams?: number | null;
    plate_weight_grams?: number | null;
    content_weight_grams?: number | null;
  } | null;
};

type WaterReadingRow = {
  recorded_at: string;
  weight_grams: number | null;
  water_ml: number | null;
};

function toNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Mismo criterio que `selectWaterSeriesValue` de today-screen.tsx: preferir
// `water_ml` si el device ya reporta volumen, si no restar la tara del peso.
function selectWaterValue(
  reading: WaterReadingRow,
  plateWeightGrams: number | null,
): number | null {
  const waterMl = toNum(reading.water_ml);
  if (waterMl !== null) return Math.max(0, waterMl);
  const gross = toNum(reading.weight_grams);
  if (gross === null) return null;
  const base =
    plateWeightGrams !== null ? Math.max(0, gross - plateWeightGrams) : gross;
  return Math.max(0, base);
}

// Mismo criterio que `waterMaxServedContentMl` de today-screen.tsx: el máximo
// contenido registrado en un evento `termino_servido`, priorizando el
// snapshot embebido en el evento y, si no vino, la lectura de `readings` más
// cercana en el tiempo (tope 20 min) -- ver `getEventContentWeightWithFallback`.
function computeMaxServedContentGrams(
  events: AuditEventRow[],
  readings: WaterReadingRow[],
  plateWeightGrams: number | null,
): number | null {
  const MAX_DELTA_MS = 20 * 60 * 1000;
  const values: number[] = [];
  for (const event of events) {
    if (event.category !== "termino_servido") continue;
    let value: number | null = null;
    const snapshot = event.snapshot;
    if (snapshot) {
      const content = toNum(snapshot.content_weight_grams);
      if (content !== null) {
        value = Math.max(0, content);
      } else {
        const weight = toNum(snapshot.weight_grams);
        if (weight !== null) {
          const plate = toNum(snapshot.plate_weight_grams) ?? 0;
          value = Math.max(0, weight - plate);
        }
      }
    }
    if (value === null && readings.length) {
      const eventTs = new Date(event.created_at).getTime();
      if (!Number.isNaN(eventTs)) {
        let bestValue: number | null = null;
        let bestDelta = Number.POSITIVE_INFINITY;
        for (const reading of readings) {
          const ts = new Date(reading.recorded_at).getTime();
          if (Number.isNaN(ts)) continue;
          const delta = Math.abs(ts - eventTs);
          if (delta > MAX_DELTA_MS || delta >= bestDelta) continue;
          const candidate = selectWaterValue(reading, plateWeightGrams);
          if (candidate === null) continue;
          bestDelta = delta;
          bestValue = candidate;
        }
        value = bestValue;
      }
    }
    if (value !== null && value > 0) values.push(value);
  }
  return values.length ? Math.max(...values) : null;
}

// Mismo criterio que `buildWellnessState({ type: "water" })`: solo hay
// evidencia real cuando existe un par inicio_hidratacion -> termino_hidratacion
// (el primer término posterior al inicio, igual que `buildAuditSessions`) --
// devuelve el `created_at` del término más reciente de esos pares, o `null`.
function findLastConfirmedWaterEventAt(events: AuditEventRow[]): string | null {
  const starts = events
    .filter((e) => e.category === "inicio_hidratacion")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  const ends = events.filter((e) => e.category === "termino_hidratacion");

  let lastEndAt: string | null = null;
  for (const start of starts) {
    const startMs = new Date(start.created_at).getTime();
    const end = ends.find((e) => new Date(e.created_at).getTime() > startMs);
    if (!end) continue;
    if (
      !lastEndAt ||
      new Date(end.created_at).getTime() > new Date(lastEndAt).getTime()
    ) {
      lastEndAt = end.created_at;
    }
  }
  return lastEndAt;
}

export type WaterSnapshot = {
  status: "ok" | "sin_dispositivo";
  percentage: number | null;
  hasEvidence: boolean;
  lastEventAt: string | null;
};

// ponytail: ventana de lecturas para resolver el fallback de `termino_servido`
// acotada a una sola página (PAGE_SIZE filas) -- es un camino secundario (el
// snapshot embebido en el evento ya cubre el caso normal), no vale pagar la
// paginación completa de `fetchHungerBarForDevice` para esto. Upgrade path si
// hace falta: extraer un fetch paginado compartido entre comida y agua.
export async function buildWaterSnapshot(
  waterDevice: WaterDevice | null,
): Promise<WaterSnapshot> {
  if (!waterDevice) {
    return {
      status: "sin_dispositivo",
      percentage: null,
      hasEvidence: false,
      lastEventAt: null,
    };
  }

  const plateWeightGrams = waterDevice.plate_weight_grams ?? null;
  const sinceIso = new Date(
    Date.now() - WINDOW_DAYS * 86_400_000,
  ).toISOString();

  const [latestResult, readingsResult, eventsResult] = await Promise.all([
    supabaseServer
      .from("readings")
      .select("recorded_at, weight_grams, water_ml")
      .eq("device_id", waterDevice.id)
      .order("recorded_at", { ascending: false })
      .limit(1),
    supabaseServer
      .from("readings")
      .select("recorded_at, weight_grams, water_ml")
      .eq("device_id", waterDevice.id)
      .gte("recorded_at", sinceIso)
      .order("recorded_at", { ascending: true })
      .limit(PAGE_SIZE),
    supabaseServer
      .from("audit_events")
      .select("created_at, payload")
      .eq("entity_type", "device")
      .eq("entity_id", waterDevice.id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(2000),
  ]);
  if (latestResult.error) throw new Error(latestResult.error.message);
  if (readingsResult.error) throw new Error(readingsResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const latest = (latestResult.data?.[0] ?? null) as WaterReadingRow | null;
  const readings = (readingsResult.data ?? []) as WaterReadingRow[];
  const events: AuditEventRow[] = (eventsResult.data ?? [])
    .map((row) => {
      const payload = (row.payload ?? {}) as {
        category?: string;
        snapshot?: AuditEventRow["snapshot"];
      };
      return payload.category
        ? {
            created_at: row.created_at as string,
            category: payload.category,
            snapshot: payload.snapshot ?? null,
          }
        : null;
    })
    .filter((row): row is AuditEventRow => row !== null);

  const grossWeight = toNum(latest?.weight_grams ?? null);
  const contentWeightGrams =
    grossWeight !== null
      ? Math.max(
          0,
          plateWeightGrams !== null
            ? grossWeight - plateWeightGrams
            : grossWeight,
        )
      : null;
  const maxServedContentGrams = computeMaxServedContentGrams(
    events,
    readings,
    plateWeightGrams,
  );
  const percentage =
    contentWeightGrams !== null &&
    maxServedContentGrams !== null &&
    maxServedContentGrams > 0
      ? Math.round(
          Math.min(1, Math.max(0, contentWeightGrams / maxServedContentGrams)) *
            100,
        )
      : null;

  const lastEventAt = findLastConfirmedWaterEventAt(events);

  return {
    status: "ok",
    percentage,
    hasEvidence: lastEventAt !== null,
    lastEventAt,
  };
}

export async function fetchHungerBarForDevice(
  device: FoodDevice,
  options?: { windowDays?: number; maxPages?: number },
) {
  const windowDays = options?.windowDays ?? WINDOW_DAYS;
  const maxPages = options?.maxPages ?? MAX_PAGES;
  const sinceIso = new Date(Date.now() - windowDays * 86_400_000).toISOString();

  const allRows: { recorded_at: string; weight_grams: number | null }[] = [];
  let truncated = false;
  for (let page = 0; page < maxPages; page++) {
    const start = page * PAGE_SIZE;
    const { data, error } = await supabaseServer
      .from("readings")
      .select("recorded_at,weight_grams")
      .eq("device_id", device.id)
      .gte("recorded_at", sinceIso)
      .not("weight_grams", "is", null)
      .order("recorded_at", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (data) allRows.push(...data);
    if (!data || data.length < PAGE_SIZE) break; // página incompleta = no hay más
    if (page === maxPages - 1) truncated = true; // se llenó la última página -- puede faltar dato más viejo
  }

  const points: ReadingPoint[] = allRows
    .filter((r) => r.weight_grams !== null)
    .map((r) => ({
      recordedAt: r.recorded_at as string,
      weightGrams: r.weight_grams as number,
    }));

  return {
    ...computeHungerBar(points, new Date(), device.device_id),
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Shaping de respuesta de /today -- extraído de las rutas
// `GET /api/pets/:id/hunger-bar` y `.../consumo-periodo` para que la ruta
// autenticada y el endpoint público de la demo (`GET /api/demo/today`,
// Knowledge/29_Specs/009-demo-today-en-vivo) produzcan EXACTAMENTE el mismo
// JSON desde la misma función. Cero cambio de lógica -- solo movido.
// ---------------------------------------------------------------------------

const CONSUMO_PERIODO_WINDOW_DIAS = 32; // 30 días + margen para "mes" completo
const CONSUMO_PERIODO_MAX_PAGES = 100; // ~100k filas -- margen sobre lo medido en KPCL0034

type OwnerRangePet = {
  food_normal_min_g?: number | null;
  food_normal_max_g?: number | null;
};

/**
 * `{ ...hungerBar, kpis, water? }` -- mismo shape que devuelve
 * `GET /api/pets/:id/hunger-bar`. `waterDevice` es opcional: cuando se pasa
 * (widget de Android, research.md Decisión 3 de
 * `Knowledge/29_Specs/010-widget-android-hero/`), el payload incluye el
 * snapshot de hidratación (`buildWaterSnapshot`); cuando no se pasa (ej.
 * `GET /api/demo/today`, que hoy calcula agua por su cuenta client-side), el
 * campo `water` directamente no aparece -- no se le fuerza un
 * "sin_dispositivo" que sería falso.
 */
export async function buildHungerBarPayload(
  device: FoodDevice,
  pet: OwnerRangePet,
  waterDevice?: WaterDevice | null,
) {
  const result = await fetchHungerBarForDevice(device);
  const ownerRange =
    pet.food_normal_min_g != null && pet.food_normal_max_g != null
      ? { minG: pet.food_normal_min_g, maxG: pet.food_normal_max_g }
      : null;
  const kpis = computeConsumoKpis(result.events, new Date(), ownerRange);
  if (waterDevice === undefined) return { ...result, kpis };
  const water = await buildWaterSnapshot(waterDevice);
  return { ...result, kpis, water };
}

/** `{ status, semana, mes, ventanaDias, truncated }` -- mismo shape que
 *  `GET /api/pets/:id/consumo-periodo` (status "ok"). */
export async function buildConsumoPeriodoPayload(device: FoodDevice) {
  const result = await fetchHungerBarForDevice(device, {
    windowDays: CONSUMO_PERIODO_WINDOW_DIAS,
    maxPages: CONSUMO_PERIODO_MAX_PAGES,
  });

  const comidas = result.events.filter((e) => e.category === "alimentacion");
  const gramosPorDia = new Map<string, number>();
  for (const e of comidas) {
    const dia = chileDateString(new Date(e.startAt));
    gramosPorDia.set(dia, (gramosPorDia.get(dia) ?? 0) + Math.abs(e.deltaG));
  }

  function totalUltimosDias(dias: number) {
    const desde = chileDateString(new Date(Date.now() - dias * 86_400_000));
    let gramos = 0;
    let diasConDatos = 0;
    for (const [dia, g] of gramosPorDia) {
      if (dia < desde) continue;
      gramos += g;
      diasConDatos++;
    }
    const comidasEnVentana = comidas.filter(
      (e) => chileDateString(new Date(e.startAt)) >= desde,
    ).length;
    return {
      gramos: Math.round(gramos),
      comidas: comidasEnVentana,
      diasConDatos,
      diasTotales: dias,
    };
  }

  return {
    status: "ok" as const,
    semana: totalUltimosDias(7),
    mes: totalUltimosDias(30),
    ventanaDias: CONSUMO_PERIODO_WINDOW_DIAS,
    truncated: result.truncated,
    // diagnóstico -- no va en la respuesta HTTP, lo usa el logging de la ruta
    diasConDatosVentana: gramosPorDia.size,
  };
}
