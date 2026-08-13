import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { supabaseServer } from "@/lib/supabase/server";
import { computeHungerBar, type ReadingPoint } from "@/lib/hunger-bar";
import { isFoodDeviceRole } from "@/lib/device-role";

// GET /api/pets/:id/hunger-bar
// Barra de hambre calculada on-demand sobre `readings` — sin tabla intermedia.
// Ver Knowledge/05_API/SPEC_HungerBar_Alimentacion.md.

const WINDOW_DAYS = 10; // suficiente para varias comidas + mediana propia; ver N_MIN_MUESTRAS
// ponytail: Supabase/PostgREST cappea CADA request a un máximo del lado del
// servidor (medido: 1000 filas, `db-max-rows`) sin importar qué .range() se
// pida — pedir range(0,4999) no trae 5000, trae 1000 igual, con
// Content-Range: 0-999/N. Asumir "si total <= PAGE_SIZE entonces 1 página
// alcanza" es el bug real (encontrado 2026-08-11: se perdían las lecturas
// de HOY, orden ascendente + corte a 1000 se queda con las más viejas).
// Fix: paginar por el tamaño de página REAL devuelto, no por este número.
const PAGE_SIZE = 1000;
const MAX_PAGES = 60; // ~60k filas tope de seguridad

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }
  const { user } = auth;
  const { id: petId } = await context.params;
  if (!petId) return apiError(req, 400, "MISSING_PET_ID", "pet_id is required");

  // Ownership: mismo patrón que /api/pets/[id]
  const { data: pet, error: petError } = await supabaseServer
    .from("pets")
    .select("id, user_id")
    .eq("id", petId)
    .single();
  if (petError || !pet)
    return apiError(req, 404, "PET_NOT_FOUND", "Pet not found");
  if (pet.user_id !== user.id)
    return apiError(req, 403, "FORBIDDEN", "Forbidden");

  // Dispositivo de comida activo de la mascota.
  // ponytail: "food_bowl" es el valor legacy del constraint — en producción los
  // devices reales usan "comedero"/"comedero_cam" (constraint devices_device_type_check
  // permite ambos idiomas por migraciones históricas, nunca se limpió a uno solo).
  // Puede haber más de un comedero "active" para la misma mascota (migración
  // allow_two_active_devices_per_pet) — se desambigua tomando el que reportó
  // lecturas más recientemente.
  // Filtro en JS (no en SQL) vía isFoodDeviceRole: algunos device_id conocidos
  // reportan device_type incorrecto desde el firmware (ver
  // Knowledge/29_Specs/SPEC_08_Auditoria_Tipificacion_Dispositivos.md — KPCL0035
  // es bebedero pero su firmware dice "comedero" en cada heartbeat) — un filtro
  // SQL por device_type solo no puede excluirlos, hace falta el override.
  const { data: candidateDevices, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id, device_id, device_type, last_seen")
    .eq("pet_id", petId)
    .eq("status", "active")
    .order("last_seen", { ascending: false, nullsFirst: false });
  if (deviceError)
    return apiError(req, 500, "SUPABASE_ERROR", deviceError.message);
  const device =
    (candidateDevices ?? []).find((d) =>
      isFoodDeviceRole(d.device_id, d.device_type),
    ) ?? null;
  if (!device) {
    logRequestEnd(req, startedAt, 200, { pet_id: petId, device: "none" });
    return NextResponse.json({
      status: "sin_dispositivo",
      percentage: null,
      lastMealDetectedAt: null,
      lastMealConfidence: null,
      estimatedNextMealAt: null,
      intervalUsedMinutes: null,
      usingFallback: false,
      sampleSize: 0,
      alertActive: false,
      hoursOverdue: null,
    });
  }

  const sinceIso = new Date(
    Date.now() - WINDOW_DAYS * 86_400_000,
  ).toISOString();

  // Paginado por tamaño de página REAL devuelto — ver nota de PAGE_SIZE arriba.
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
    if (error) return apiError(req, 500, "SUPABASE_ERROR", error.message);
    if (data) allRows.push(...data);
    if (!data || data.length < PAGE_SIZE) break; // página incompleta = no hay más
  }

  const points: ReadingPoint[] = allRows
    .filter((r) => r.weight_grams !== null)
    .map((r) => ({
      recordedAt: r.recorded_at as string,
      weightGrams: r.weight_grams as number,
    }));

  const result = computeHungerBar(points);

  logRequestEnd(req, startedAt, 200, {
    pet_id: petId,
    rows: points.length,
    sample_size: result.sampleSize,
  });
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
    },
  });
}
