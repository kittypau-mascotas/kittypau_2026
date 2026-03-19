import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  enforceBodySize,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../_utils";
import { logAudit } from "../_audit";
import { checkRateLimit, getRateKeyFromRequest } from "../_rate-limit";
import { supabaseServer } from "@/lib/supabase/server";
import type { KittypauErrorType } from "@/lib/errors/kittypau-error";

export const runtime = "edge";

const ALLOWED_STATUS = new Set(["active", "inactive", "maintenance"]);
const ALLOWED_DEVICE_TYPE = new Set(["food_bowl", "water_bowl"]);

async function detectCriticalSystemErrorType(): Promise<KittypauErrorType | null> {
  // Best-effort: if this fails, do not block the app.
  try {
    const { data, error } = await supabaseServer
      .from("bridge_heartbeats")
      .select("bridge_id, last_seen, mqtt_connected, last_mqtt_at")
      .order("last_seen", { ascending: false })
      .limit(40);

    if (error) return null;

    const rows = (data ?? []) as Array<{
      bridge_id?: string | null;
      last_seen?: string | null;
      mqtt_connected?: boolean | null;
      last_mqtt_at?: string | null;
    }>;

    if (rows.length === 0) return null;

    const now = Date.now();
    const bridgeCutoffIso = new Date(now - 10 * 60_000).toISOString();
    const mqttCutoffIso = new Date(now - 15 * 60_000).toISOString();

    const online = rows.filter((row) => {
      const lastSeen = row.last_seen
        ? new Date(row.last_seen).toISOString()
        : null;
      return !!lastSeen && lastSeen >= bridgeCutoffIso;
    });

    if (online.length === 0) return "bridge_offline";

    const mqttDown = online.filter((row) => {
      if (row.mqtt_connected === false) return true;
      const lastMqtt = row.last_mqtt_at
        ? new Date(row.last_mqtt_at).toISOString()
        : null;
      if (!lastMqtt) return true;
      return lastMqtt < mqttCutoffIso;
    });

    if (mqttDown.length === online.length) return "mqtt_broker_down";
    if (mqttDown.length > 0) return "mqtt_unstable";

    return null;
  } catch {
    return null;
  }
}

function triggerBackgroundHealthCheck(req: NextRequest) {
  const token = process.env.BRIDGE_HEARTBEAT_SECRET;
  if (!token) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  void fetch(
    `${req.nextUrl.origin}/api/bridge/health-check?stale_min=5&device_stale_min=5&source=devices_get`,
    {
      method: "GET",
      headers: { "x-bridge-token": token },
      cache: "no-store",
      signal: controller.signal,
    },
  )
    .catch(() => {
      // Best-effort trigger only.
    })
    .finally(() => clearTimeout(timeout));
}

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  triggerBackgroundHealthCheck(req);

  const { supabase, user } = auth;
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(Math.max(Number(limitParam ?? 20), 1), 100);
  const paginate = Boolean(limitParam || cursor);

  let query = supabase
    .from("devices")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const cacheHeaders = {
    "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
  };

  const criticalType = await detectCriticalSystemErrorType();
  const responseHeaders = criticalType
    ? { ...cacheHeaders, "x-kp-error-type": criticalType }
    : cacheHeaders;

  if (!paginate) {
    logRequestEnd(req, startedAt, 200, { count: data?.length ?? 0 });
    return NextResponse.json(data ?? [], { headers: responseHeaders });
  }

  const nextCursor =
    data && data.length > 0
      ? (data[data.length - 1]?.created_at ?? null)
      : null;

  logRequestEnd(req, startedAt, 200, {
    count: data?.length ?? 0,
    next_cursor: nextCursor,
  });
  return NextResponse.json(
    { data: data ?? [], next_cursor: nextCursor },
    { headers: responseHeaders },
  );
}

export async function POST(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { supabase, user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:devices_post`;
  const rate = await checkRateLimit(rateKey, 30, 60_000);
  if (!rate.ok) {
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
  }
  let body: {
    pet_id?: string;
    device_id?: string;
    device_type?: string;
    status?: string;
    battery_level?: number;
    plate_weight_grams?: number;
  };

  try {
    const sizeError = enforceBodySize(req, 8_000);
    if (sizeError) return sizeError;
    body = (await req.json()) as typeof body;
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON");
  }

  const payload = {
    owner_id: user.id,
    pet_id: body?.pet_id ?? null,
    device_id: body?.device_id,
    device_type: body?.device_type,
    status: body?.status ?? "active",
    battery_level: body?.battery_level ?? null,
    plate_weight_grams: body?.plate_weight_grams ?? null,
  };

  if (payload.pet_id && typeof payload.pet_id !== "string") {
    return apiError(req, 400, "INVALID_PET_ID", "pet_id must be a string");
  }

  if (!payload.device_id || !payload.device_type || !payload.pet_id) {
    return apiError(
      req,
      400,
      "MISSING_FIELDS",
      "device_id, device_type, and pet_id are required",
    );
  }

  if (!/^KPCL\d{4}$/.test(payload.device_id)) {
    return apiError(
      req,
      400,
      "INVALID_DEVICE_CODE",
      "device_id must match KPCL0000 format",
    );
  }

  if (!ALLOWED_DEVICE_TYPE.has(payload.device_type)) {
    return apiError(req, 400, "INVALID_DEVICE_TYPE", "Invalid device_type");
  }

  if (payload.status && !ALLOWED_STATUS.has(payload.status)) {
    return apiError(req, 400, "INVALID_STATUS", "Invalid status");
  }

  if (
    payload.battery_level !== null &&
    payload.battery_level !== undefined &&
    (payload.battery_level < 0 || payload.battery_level > 100)
  ) {
    return apiError(
      req,
      400,
      "BATTERY_OUT_OF_RANGE",
      "battery_level must be between 0 and 100",
    );
  }

  if (
    payload.plate_weight_grams !== null &&
    payload.plate_weight_grams !== undefined &&
    (!Number.isFinite(payload.plate_weight_grams) ||
      payload.plate_weight_grams <= 0 ||
      payload.plate_weight_grams > 5000)
  ) {
    return apiError(
      req,
      400,
      "INVALID_PLATE_WEIGHT",
      "plate_weight_grams must be between 1 and 5000",
    );
  }

  const { data, error } = await supabaseServer.rpc("link_device_to_pet", {
    p_owner_id: user.id,
    p_pet_id: payload.pet_id,
    p_device_code: payload.device_id,
    p_device_type: payload.device_type,
    p_status: payload.status,
    p_battery_level: payload.battery_level,
  });

  if (error || !data) {
    const message = error?.message ?? "RPC failed";
    const lower = message.toLowerCase();
    if (lower.includes("pet not found")) {
      return apiError(req, 404, "PET_NOT_FOUND", "Pet not found");
    }
    if (lower.includes("forbidden")) {
      return apiError(req, 403, "FORBIDDEN", "Forbidden");
    }
    if (lower.includes("idx_devices_active_per_pet")) {
      await supabaseServer
        .from("devices")
        .update({ status: "inactive" })
        .eq("pet_id", payload.pet_id)
        .eq("status", "active");

      const retry = await supabaseServer.rpc("link_device_to_pet", {
        p_owner_id: user.id,
        p_pet_id: payload.pet_id,
        p_device_code: payload.device_id,
        p_device_type: payload.device_type,
        p_status: payload.status,
        p_battery_level: payload.battery_level,
      });

      if (retry.error || !retry.data) {
        return apiError(
          req,
          500,
          "SUPABASE_ERROR",
          retry.error?.message ?? "RPC failed",
        );
      }

      await logAudit({
        event_type: "device_created",
        actor_id: user.id,
        entity_type: "device",
        entity_id: retry.data.id,
        payload: { device_code: retry.data.device_code, pet_id: retry.data.pet_id },
      });

      if (payload.plate_weight_grams !== null) {
        await supabase
          .from("devices")
          .update({ plate_weight_grams: payload.plate_weight_grams })
          .eq("id", retry.data.id)
          .eq("owner_id", user.id);
      }

      logRequestEnd(req, startedAt, 201, { device_id: retry.data.id });
      return NextResponse.json(
        {
          ...retry.data,
          plate_weight_grams: payload.plate_weight_grams,
        },
        { status: 201 },
      );
    }
    return apiError(req, 500, "SUPABASE_ERROR", message);
  }

  await logAudit({
    event_type: "device_created",
    actor_id: user.id,
    entity_type: "device",
    entity_id: data.id,
    payload: { device_code: data.device_code, pet_id: data.pet_id },
  });

  if (payload.plate_weight_grams !== null) {
    await supabase
      .from("devices")
      .update({ plate_weight_grams: payload.plate_weight_grams })
      .eq("id", data.id)
      .eq("owner_id", user.id);
  }

  logRequestEnd(req, startedAt, 201, { device_id: data.id });
  return NextResponse.json(
    {
      ...data,
      plate_weight_grams: payload.plate_weight_grams,
    },
    { status: 201 },
  );
}
