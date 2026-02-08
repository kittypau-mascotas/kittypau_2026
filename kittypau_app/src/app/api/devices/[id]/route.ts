import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  enforceBodySize,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../_utils";
import { checkRateLimit, getRateKeyFromRequest } from "../../_rate-limit";

const ALLOWED_STATUS = new Set(["active", "inactive", "maintenance"]);
const ALLOWED_DEVICE_TYPE = new Set(["food_bowl", "water_bowl"]);
const ALLOWED_DEVICE_STATE = new Set([
  "factory",
  "claimed",
  "linked",
  "offline",
  "lost",
  "error",
]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error);
  }

  const { supabase, user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:devices_patch`;
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
  const { id: deviceId } = await context.params;

  if (!deviceId) {
    return apiError(req, 400, "MISSING_DEVICE_ID", "device_id is required");
  }

  let body: {
    status?: string;
    device_state?: string;
    pet_id?: string;
    device_type?: string;
  };

  try {
    const sizeError = enforceBodySize(req, 8_000);
    if (sizeError) return sizeError;
    body = (await req.json()) as typeof body;
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON");
  }

  if (body.status && !ALLOWED_STATUS.has(body.status)) {
    return apiError(req, 400, "INVALID_STATUS", "Invalid status");
  }

  if (body.device_type && !ALLOWED_DEVICE_TYPE.has(body.device_type)) {
    return apiError(req, 400, "INVALID_DEVICE_TYPE", "Invalid device_type");
  }

  if (body.device_state && !ALLOWED_DEVICE_STATE.has(body.device_state)) {
    return apiError(req, 400, "INVALID_DEVICE_STATE", "Invalid device_state");
  }

  if (body.pet_id === null) {
    return apiError(req, 400, "INVALID_PET_ID", "pet_id cannot be null");
  }

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, owner_id")
    .eq("id", deviceId)
    .single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  if (device.owner_id !== user.id) {
    return apiError(req, 403, "FORBIDDEN", "Forbidden");
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.status) updatePayload.status = body.status;
  if (body.device_state) updatePayload.device_state = body.device_state;
  if (body.device_type) updatePayload.device_type = body.device_type;
  if (body.pet_id) updatePayload.pet_id = body.pet_id;

  if (Object.keys(updatePayload).length === 0) {
    return apiError(req, 400, "NO_FIELDS", "No fields to update");
  }

  const { data, error } = await supabase
    .from("devices")
    .update(updatePayload)
    .eq("id", deviceId)
    .select()
    .single();

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  logRequestEnd(req, startedAt, 200, { device_id: deviceId });
  return NextResponse.json(data, { status: 200 });
}
