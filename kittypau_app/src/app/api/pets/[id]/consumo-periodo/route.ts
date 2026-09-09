import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { supabaseServer } from "@/lib/supabase/server";
import {
  fetchHungerBarForDevice,
  resolveFoodDevice,
} from "@/lib/hunger-bar-server";
import { chileDateString } from "@/lib/time/chile";

// GET /api/pets/:id/consumo-periodo
// "Cuánto come por semana/mes" en vivo -- pedido de Mauro 2026-09-09 tras
// confirmar que vale el costo de una ventana más larga (documentado en
// Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md §2.3).
//
// Deliberadamente NO es el mismo endpoint que /hunger-bar (que se pollea
// cada 5 min en today/page.tsx) -- WINDOW_DIAS acá es 3x más grande, y
// recorrer eso cada 5 min sería carísimo para un número que apenas cambia
// minuto a minuto. El frontend llama esto una sola vez al montar la
// página, y el Cache-Control es de 10 min (vs. 30s de /hunger-bar).
const WINDOW_DIAS = 32; // 30 días + margen para que "mes" cubra un mes completo
const MAX_PAGES = 100; // ~100k filas -- margen sobre lo medido en KPCL0034 (~58k en 32 días)

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

  let result;
  try {
    result = await fetchHungerBarForDevice(device, {
      windowDays: WINDOW_DIAS,
      maxPages: MAX_PAGES,
    });
  } catch (err) {
    return apiError(
      req,
      500,
      "SUPABASE_ERROR",
      err instanceof Error ? err.message : String(err),
    );
  }

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

  logRequestEnd(req, startedAt, 200, {
    pet_id: petId,
    dias_con_datos: gramosPorDia.size,
    truncated: result.truncated,
  });
  return NextResponse.json(
    {
      status: "ok",
      semana: totalUltimosDias(7),
      mes: totalUltimosDias(30),
      ventanaDias: WINDOW_DIAS,
      truncated: result.truncated, // true = hay más historial del que se pudo traer -- el número puede quedar corto
    },
    {
      headers: {
        "Cache-Control": "private, max-age=600, stale-while-revalidate=1800",
      },
    },
  );
}
