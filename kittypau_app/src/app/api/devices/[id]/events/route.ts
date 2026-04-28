import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { checkRateLimit, getRateKeyFromRequest } from "../../../_rate-limit";

export const runtime = "edge";

const ALLOWED_CATEGORIES = new Set([
  "inicio_alimentacion",
  "termino_alimentacion",
  "inicio_hidratacion",
  "termino_hidratacion",
  "inicio_servido",
  "termino_servido",
  "tare_con_plato",
  "kpcl_sin_plato",
  "kpcl_con_plato",
]);

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// GET /api/devices/[id]/events?from=ISO&to=ISO&categories=inicio_alimentacion,termino_alimentacion
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { supabase, user } = auth;
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

  const requestedCategories = categoriesParam
    ? categoriesParam.split(",").filter((c) => ALLOWED_CATEGORIES.has(c.trim()))
    : ["inicio_alimentacion", "termino_alimentacion", "inicio_hidratacion", "termino_hidratacion"];

  // Verify ownership
  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id")
    .eq("id", deviceId)
    .eq("owner_id", user.id)
    .single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  let query = supabase
    .from("audit_events")
    .select("id, created_at, payload")
    .eq("entity_type", "device")
    .eq("entity_id", deviceId)
    .eq("event_type", "manual_bowl_category")
    .in(
      "payload->>category",
      requestedCategories,
    )
    .order("created_at", { ascending: true })
    .limit(500);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const rows = (data ?? []).map((row) => {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const category = (payload.category as string) ?? "";
    const snapshot =
      payload.snapshot && typeof payload.snapshot === "object"
        ? (payload.snapshot as Record<string, unknown>)
        : null;

    const categoryType = category.includes("hidratacion")
      ? "hidratacion"
      : category.includes("servido")
        ? "servido"
        : category.includes("alimentacion")
          ? "alimentacion"
          : null;

    return {
      id: row.id,
      created_at: row.created_at,
      category,
      category_label: (payload.category_label as string) ?? "",
      category_type: categoryType,
      snapshot: snapshot
        ? {
            weight_grams: toNumber(snapshot.weight_grams),
            plate_weight_grams: toNumber(snapshot.plate_weight_grams),
            content_weight_grams: toNumber(snapshot.content_weight_grams),
            sensor_recorded_at:
              typeof snapshot.sensor_recorded_at === "string"
                ? snapshot.sensor_recorded_at
                : null,
          }
        : null,
    };
  });

  logRequestEnd(req, startedAt, 200, { count: rows.length, device_id: deviceId });

  return NextResponse.json({ data: rows });
}
