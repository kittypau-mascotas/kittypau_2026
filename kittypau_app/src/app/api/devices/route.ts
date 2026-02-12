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

const ALLOWED_STATUS = new Set(["active", "inactive", "maintenance"]);
const ALLOWED_DEVICE_TYPE = new Set(["food_bowl", "water_bowl"]);

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
    }
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

  if (!paginate) {
    logRequestEnd(req, startedAt, 200, { count: data?.length ?? 0 });
    return NextResponse.json(data ?? []);
  }

  const nextCursor =
    data && data.length > 0 ? data[data.length - 1]?.created_at ?? null : null;

  logRequestEnd(req, startedAt, 200, {
    count: data?.length ?? 0,
    next_cursor: nextCursor,
  });
  return NextResponse.json({ data: data ?? [], next_cursor: nextCursor });
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
    return apiError(
      req,
      429,
      "RATE_LIMITED",
      "Too many requests",
      undefined,
      { "Retry-After": String(rate.retryAfter) }
    );
  }
  let body: {
    pet_id?: string;
    device_id?: string;
    device_type?: string;
    status?: string;
    battery_level?: number;
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
  };

  if (payload.pet_id && typeof payload.pet_id !== "string") {
    return apiError(req, 400, "INVALID_PET_ID", "pet_id must be a string");
  }

  if (!payload.device_id || !payload.device_type || !payload.pet_id) {
    return apiError(
      req,
      400,
      "MISSING_FIELDS",
      "device_id, device_type, and pet_id are required"
    );
  }

  if (!/^KPCL\d{4}$/.test(payload.device_id)) {
    return apiError(
      req,
      400,
      "INVALID_DEVICE_CODE",
      "device_id must match KPCL0000 format"
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
      "battery_level must be between 0 and 100"
    );
  }

  const { data, error } = await supabaseServer.rpc("link_device_to_pet", {
    p_owner_id: user.id,
    p_pet_id: payload.pet_id,
    p_device_id: payload.device_id,
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
        p_device_id: payload.device_id,
        p_device_type: payload.device_type,
        p_status: payload.status,
        p_battery_level: payload.battery_level,
      });

      if (retry.error || !retry.data) {
        return apiError(
          req,
          500,
          "SUPABASE_ERROR",
          retry.error?.message ?? "RPC failed"
        );
      }

      await logAudit({
        event_type: "device_created",
        actor_id: user.id,
        entity_type: "device",
        entity_id: retry.data.id,
        payload: { device_id: retry.data.device_id, pet_id: retry.data.pet_id },
      });

      logRequestEnd(req, startedAt, 201, { device_id: retry.data.id });
      return NextResponse.json(retry.data, { status: 201 });
    }
    return apiError(req, 500, "SUPABASE_ERROR", message);
  }

  await logAudit({
    event_type: "device_created",
    actor_id: user.id,
    entity_type: "device",
    entity_id: data.id,
    payload: { device_id: data.device_id, pet_id: data.pet_id },
  });

  logRequestEnd(req, startedAt, 201, { device_id: data.id });
  return NextResponse.json(data, { status: 201 });
}

