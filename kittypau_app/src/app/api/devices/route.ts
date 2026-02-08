import { NextRequest, NextResponse } from "next/server";
import { apiError, enforceBodySize, getUserClient } from "../_utils";
import { logAudit } from "../_audit";
import { checkRateLimit, getRateKeyFromRequest } from "../_rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

const ALLOWED_STATUS = new Set(["active", "inactive", "maintenance"]);
const ALLOWED_DEVICE_TYPE = new Set(["food_bowl", "water_bowl"]);

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error);
  }

  const { user } = auth;
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error);
  }

  const { supabase, user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:devices_post`;
  const rate = checkRateLimit(rateKey, 30, 60_000);
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
    device_code?: string;
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
    device_code: body?.device_code,
    device_type: body?.device_type,
    status: body?.status ?? "active",
    battery_level: body?.battery_level ?? null,
  };

  if (payload.pet_id && typeof payload.pet_id !== "string") {
    return apiError(req, 400, "INVALID_PET_ID", "pet_id must be a string");
  }

  if (!payload.device_code || !payload.device_type || !payload.pet_id) {
    return apiError(
      req,
      400,
      "MISSING_FIELDS",
      "device_code, device_type, and pet_id are required"
    );
  }

  if (!/^KPCL\d{4}$/.test(payload.device_code)) {
    return apiError(
      req,
      400,
      "INVALID_DEVICE_CODE",
      "device_code must match KPCL0000 format"
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
    p_device_code: payload.device_code,
    p_device_type: payload.device_type,
    p_status: payload.status,
    p_battery_level: payload.battery_level,
  });

  if (error || !data) {
    const message = error?.message ?? "RPC failed";
    if (message.toLowerCase().includes("pet not found")) {
      return apiError(req, 404, "PET_NOT_FOUND", "Pet not found");
    }
    if (message.toLowerCase().includes("forbidden")) {
      return apiError(req, 403, "FORBIDDEN", "Forbidden");
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

  return NextResponse.json(data, { status: 201 });
}
