import { supabaseServer } from "@/lib/supabase/server";
import { computeHungerBar, type ReadingPoint } from "@/lib/hunger-bar";
import { isFoodDeviceRole } from "@/lib/device-role";
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

/** `{ ...hungerBar, kpis }` -- mismo shape que devuelve `GET /api/pets/:id/hunger-bar`. */
export async function buildHungerBarPayload(
  device: FoodDevice,
  pet: OwnerRangePet,
) {
  const result = await fetchHungerBarForDevice(device);
  const ownerRange =
    pet.food_normal_min_g != null && pet.food_normal_max_g != null
      ? { minG: pet.food_normal_min_g, maxG: pet.food_normal_max_g }
      : null;
  const kpis = computeConsumoKpis(result.events, new Date(), ownerRange);
  return { ...result, kpis };
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
