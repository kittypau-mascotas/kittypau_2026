import { supabaseServer } from "@/lib/supabase/server";
import { computeHungerBar, type ReadingPoint } from "@/lib/hunger-bar";
import { isFoodDeviceRole } from "@/lib/device-role";

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

export async function fetchHungerBarForDevice(device: FoodDevice) {
  const sinceIso = new Date(
    Date.now() - WINDOW_DAYS * 86_400_000,
  ).toISOString();

  const allRows: { recorded_at: string; weight_grams: number | null }[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
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
  }

  const points: ReadingPoint[] = allRows
    .filter((r) => r.weight_grams !== null)
    .map((r) => ({
      recordedAt: r.recorded_at as string,
      weightGrams: r.weight_grams as number,
    }));

  return computeHungerBar(points, new Date(), device.device_id);
}
