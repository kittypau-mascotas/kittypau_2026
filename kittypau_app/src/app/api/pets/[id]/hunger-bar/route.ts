import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { supabaseServer } from "@/lib/supabase/server";
import { computeConsumoKpis } from "@/lib/consumo-kpis";
import {
  fetchHungerBarForDevice,
  resolveFoodDevice,
} from "@/lib/hunger-bar-server";

// GET /api/pets/:id/hunger-bar
// Barra de hambre calculada on-demand sobre `readings` — sin tabla intermedia.
// Ver Knowledge/05_API/SPEC_HungerBar_Alimentacion.md. Resolución de
// dispositivo + fetch de `readings` + `computeHungerBar` viven en
// `@/lib/hunger-bar-server` (reusado también por el cron de push).

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
    .select("id, user_id, food_normal_min_g, food_normal_max_g")
    .eq("id", petId)
    .single();
  if (petError || !pet)
    return apiError(req, 404, "PET_NOT_FOUND", "Pet not found");
  if (pet.user_id !== user.id)
    return apiError(req, 403, "FORBIDDEN", "Forbidden");

  // Dispositivo de comida activo de la mascota -- desambiguación por
  // last_seen + isFoodDeviceRole documentada en resolveFoodDevice().
  let device;
  try {
    device = await resolveFoodDevice(petId);
  } catch (err) {
    return apiError(
      req,
      500,
      "SUPABASE_ERROR",
      err instanceof Error ? err.message : String(err),
    );
  }
  if (!device) {
    logRequestEnd(req, startedAt, 200, { pet_id: petId, device: "none" });
    return NextResponse.json({
      status: "sin_dispositivo",
      percentage: null,
      lastMealDetectedAt: null,
      lastMealConfidence: null,
      lastMealIsProvisional: false,
      estimatedNextMealAt: null,
      intervalUsedMinutes: null,
      usingFallback: false,
      sampleSize: 0,
      alertActive: false,
      hoursOverdue: null,
      events: [],
      kpis: null,
    });
  }

  let result;
  try {
    result = await fetchHungerBarForDevice(device);
  } catch (err) {
    return apiError(
      req,
      500,
      "SUPABASE_ERROR",
      err instanceof Error ? err.message : String(err),
    );
  }

  // KPIs de consumo (Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md §2.2)
  // -- sobre el mismo `events` que ya calculó computeHungerBar, sin fetch aparte.
  const ownerRange =
    pet.food_normal_min_g != null && pet.food_normal_max_g != null
      ? {
          minG: pet.food_normal_min_g as number,
          maxG: pet.food_normal_max_g as number,
        }
      : null;
  const kpis = computeConsumoKpis(result.events, new Date(), ownerRange);

  logRequestEnd(req, startedAt, 200, {
    pet_id: petId,
    events: result.events.length,
    sample_size: result.sampleSize,
  });
  return NextResponse.json(
    { ...result, kpis },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    },
  );
}
