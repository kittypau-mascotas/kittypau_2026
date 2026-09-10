import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { supabaseServer } from "@/lib/supabase/server";
import {
  buildConsumoPeriodoPayload,
  resolveFoodDevice,
} from "@/lib/hunger-bar-server";

// GET /api/pets/:id/consumo-periodo
// "Cuánto come por semana/mes" en vivo -- pedido de Mauro 2026-09-09 tras
// confirmar que vale el costo de una ventana más larga (documentado en
// Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md §2.3).
//
// Deliberadamente NO es el mismo endpoint que /hunger-bar (que se pollea
// cada 5 min en today/page.tsx) -- la ventana acá es 3x más grande, y
// recorrer eso cada 5 min sería carísimo para un número que apenas cambia
// minuto a minuto. El frontend llama esto una sola vez al montar la
// página, y el Cache-Control es de 10 min (vs. 30s de /hunger-bar).
//
// El group-by semana/mes vive en `buildConsumoPeriodoPayload`
// (@/lib/hunger-bar-server) -- compartido con `GET /api/demo/today`
// (Knowledge/29_Specs/009-demo-today-en-vivo) para no duplicar el shaping.

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

  const { data: pet, error: petError } = await supabaseServer
    .from("pets")
    .select("id, user_id")
    .eq("id", petId)
    .single();
  if (petError || !pet)
    return apiError(req, 404, "PET_NOT_FOUND", "Pet not found");
  if (pet.user_id !== user.id)
    return apiError(req, 403, "FORBIDDEN", "Forbidden");

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
    return NextResponse.json({ status: "sin_dispositivo" });
  }

  let payload;
  try {
    payload = await buildConsumoPeriodoPayload(device);
  } catch (err) {
    return apiError(
      req,
      500,
      "SUPABASE_ERROR",
      err instanceof Error ? err.message : String(err),
    );
  }

  // `diasConDatosVentana` es diagnóstico (logging) -- no va en la respuesta HTTP.
  const { diasConDatosVentana, ...body } = payload;

  logRequestEnd(req, startedAt, 200, {
    pet_id: petId,
    dias_con_datos: diasConDatosVentana,
    truncated: body.truncated,
  });
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, max-age=600, stale-while-revalidate=1800",
    },
  });
}
