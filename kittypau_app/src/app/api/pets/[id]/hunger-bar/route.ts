import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { supabaseServer } from "@/lib/supabase/server";
import { computeHungerBar, type ReadingPoint } from "@/lib/hunger-bar";

// GET /api/pets/:id/hunger-bar
// Barra de hambre calculada on-demand sobre `readings` — sin tabla intermedia.
// Ver Knowledge/05_API/SPEC_HungerBar_Alimentacion.md.

const WINDOW_DAYS = 10; // suficiente para varias comidas + mediana propia; ver N_MIN_MUESTRAS
const PAGE_SIZE = 5000;

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
  const FOOD_DEVICE_TYPES = ["food_bowl", "comedero", "comedero_cam"];
  const { data: candidateDevices, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id, last_seen")
    .eq("pet_id", petId)
    .in("device_type", FOOD_DEVICE_TYPES)
    .eq("status", "active")
    .order("last_seen", { ascending: false, nullsFirst: false })
    .limit(1);
  if (deviceError)
    return apiError(req, 500, "SUPABASE_ERROR", deviceError.message);
  const device = candidateDevices?.[0] ?? null;
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

  // Paginado igual que /api/readings/bucketed — evita el límite de 5000 filas de Supabase
  const {
    data: firstPage,
    error: firstError,
    count,
  } = await supabaseServer
    .from("readings")
    .select("recorded_at,weight_grams", { count: "exact" })
    .eq("device_id", device.id)
    .gte("recorded_at", sinceIso)
    .not("weight_grams", "is", null)
    .order("recorded_at", { ascending: true })
    .range(0, PAGE_SIZE - 1);
  if (firstError)
    return apiError(req, 500, "SUPABASE_ERROR", firstError.message);

  const totalRows = count ?? 0;
  const allRows = [...(firstPage ?? [])];
  if (totalRows > PAGE_SIZE) {
    const pageCount = Math.min(Math.ceil(totalRows / PAGE_SIZE), 12); // cap ~60k filas
    const extra = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, i) => {
        const start = (i + 1) * PAGE_SIZE;
        return supabaseServer
          .from("readings")
          .select("recorded_at,weight_grams")
          .eq("device_id", device.id)
          .gte("recorded_at", sinceIso)
          .not("weight_grams", "is", null)
          .order("recorded_at", { ascending: true })
          .range(start, start + PAGE_SIZE - 1);
      }),
    );
    for (const { data } of extra) if (data) allRows.push(...data);
    allRows.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
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
