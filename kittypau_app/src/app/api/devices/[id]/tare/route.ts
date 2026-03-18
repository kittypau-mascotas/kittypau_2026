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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:tare`;
  const rate = await checkRateLimit(rateKey, 5, 60_000);
  if (!rate.ok) {
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  const { id } = await context.params;

  // Verify device belongs to the authenticated user
  const { data: device, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id, device_id, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  // Enqueue command — bridge polls this table and publishes via MQTT
  const { error: insertError } = await supabaseServer
    .from("device_commands")
    .insert({
      device_id: device.device_id,
      command: { command: "CALIBRATE_WEIGHT", action: "tare" },
      status: "pending",
    });

  if (insertError) {
    return apiError(req, 500, "SUPABASE_ERROR", insertError.message);
  }

  logRequestEnd(req, startedAt, 200, { device_id: device.device_id });
  return NextResponse.json({ ok: true, device_id: device.device_id });
}
