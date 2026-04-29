import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { checkRateLimit, getRateKeyFromRequest } from "../../../_rate-limit";

export const runtime = "edge";

const ALLOWED_TYPES = new Set(["alimentacion", "servido", "hidratacion"]);

function toPositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

// GET /api/devices/[id]/sessions?type=alimentacion&from=ISO&to=ISO&limit=200
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
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:device_sessions`;
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
  const type = searchParams.get("type");
  const limit = toPositiveInt(searchParams.get("limit"), 200, 1000);

  if (type && !ALLOWED_TYPES.has(type)) {
    return apiError(req, 400, "INVALID_TYPE", "Invalid session type");
  }

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
    .from("device_bowl_sessions")
    .select(
      "id,device_uuid,device_code,session_type,source,session_start_at,session_end_at,duration_seconds,start_content_grams,end_content_grams,net_grams,measurement_direction,is_valid,validation_reason,start_event_id,end_event_id",
    )
    .eq("device_uuid", deviceId)
    .order("session_start_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("session_type", type);
  if (from) query = query.gte("session_start_at", from);
  if (to) query = query.lte("session_start_at", to);

  const { data, error } = await query;

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    device_uuid: row.device_uuid,
    device_code: row.device_code,
    session_type: row.session_type,
    source: row.source,
    session_start_at: row.session_start_at,
    session_end_at: row.session_end_at,
    duration_seconds: row.duration_seconds,
    start_content_grams: row.start_content_grams,
    end_content_grams: row.end_content_grams,
    net_grams: row.net_grams,
    measurement_direction: row.measurement_direction,
    is_valid: row.is_valid,
    validation_reason: row.validation_reason,
    start_event_id: row.start_event_id,
    end_event_id: row.end_event_id,
  }));

  logRequestEnd(req, startedAt, 200, {
    count: rows.length,
    device_id: deviceId,
    type: type ?? "all",
  });

  return NextResponse.json({ data: rows });
}
