import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { checkRateLimit, getRateKeyFromRequest } from "../../../_rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "edge";

// Bug real encontrado 2026-08-28: esta ruta devolvía siempre `{ data: [] }`
// hardcodeado ("sin categorías activas") -- por eso `bowlMaxServedContentGrams`/
// `waterMaxServedContentMl` en today/page.tsx nunca podían calcular un "100%"
// real, aunque /api/devices/[id]/category sí escribe eventos `termino_servido`
// en `audit_events` con normalidad. Implementación real: lee lo que esa ruta
// POST ya escribe (entity_type='device', entity_id=<uuid>, payload.category).
const CATEGORY_TYPE_BY_PREFIX: Record<
  string,
  "alimentacion" | "servido" | "hidratacion"
> = {
  alimentacion: "alimentacion",
  servido: "servido",
  hidratacion: "hidratacion",
};

function categoryType(
  category: string,
): "alimentacion" | "servido" | "hidratacion" | null {
  const suffix = category.split("_")[1] ?? "";
  return CATEGORY_TYPE_BY_PREFIX[suffix] ?? null;
}

// GET /api/devices/[id]/events?from=ISO&to=ISO&categories=a,b,c
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
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:device_events`;
  const rate = await checkRateLimit(rateKey, 60, 60_000);
  if (!rate.ok) {
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  const { id: deviceId } = await context.params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const categoriesParam = searchParams.get("categories");
  const categories = categoriesParam
    ? new Set(
        categoriesParam
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      )
    : null;

  // supabaseServer (service role) para el ownership check y la query: audit_events
  // no tiene policy de RLS que deje leer a usuarios normales (mismo motivo, ademas
  // de la desconexion original, por el que esta ruta terminaba devolviendo [] --
  // probado en vivo 2026-08-28: "permission denied for table audit_events" con el
  // cliente de usuario). category/route.ts, que SI escribe en esta tabla, ya usa
  // supabaseServer para todo -- este GET hace el mismo chequeo de dueno a mano.
  const { data: device, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id")
    .eq("id", deviceId)
    .eq("owner_id", user.id)
    .single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  let query = supabaseServer
    .from("audit_events")
    .select("id,created_at,payload")
    .eq("entity_type", "device")
    .eq("entity_id", deviceId)
    .order("created_at", { ascending: true })
    .limit(2000);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const rows = (data ?? [])
    .map((row) => {
      const payload = (row.payload ?? {}) as {
        category?: string;
        category_label?: string;
        snapshot?: {
          weight_grams?: number | null;
          plate_weight_grams?: number | null;
          content_weight_grams?: number | null;
          sensor_recorded_at?: string | null;
        } | null;
      };
      const category = payload.category ?? null;
      if (!category) return null;
      if (categories && !categories.has(category)) return null;
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

  logRequestEnd(req, startedAt, 200, {
    device_id: deviceId,
    count: rows.length,
  });
  return NextResponse.json({ data: rows });
}
