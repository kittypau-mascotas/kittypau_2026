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

// POST /api/devices/{id}/wifi
// Envía comando ADDWIFI al dispositivo vía device_commands → bridge → MQTT
// Body: { ssid: string, pass: string }
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
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:wifi`;
  const rate = await checkRateLimit(rateKey, 10, 60_000);
  if (!rate.ok) {
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON body");
  }

  const { ssid, pass } = body as Record<string, unknown>;

  if (typeof ssid !== "string" || ssid.trim().length === 0) {
    return apiError(req, 400, "MISSING_SSID", "ssid is required");
  }
  if (typeof pass !== "string") {
    return apiError(req, 400, "MISSING_PASS", "pass is required");
  }

  const { data: device, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id, device_id, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  const { error: insertError } = await supabaseServer
    .from("device_commands")
    .insert({
      device_id: device.device_id,
      command: { command: "ADDWIFI", ssid: ssid.trim(), pass },
      status: "pending",
    });

  if (insertError) {
    return apiError(req, 500, "SUPABASE_ERROR", insertError.message);
  }

  logRequestEnd(req, startedAt, 200, { device_id: device.device_id });
  return NextResponse.json({ ok: true, device_id: device.device_id });
}

// DELETE /api/devices/{id}/wifi
// Envía comando REMOVEWIFI al dispositivo
// Body: { ssid: string }
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:wifi`;
  const rate = await checkRateLimit(rateKey, 10, 60_000);
  if (!rate.ok) {
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON body");
  }

  const { ssid } = body as Record<string, unknown>;

  if (typeof ssid !== "string" || ssid.trim().length === 0) {
    return apiError(req, 400, "MISSING_SSID", "ssid is required");
  }

  const { data: device, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id, device_id, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  const { error: insertError } = await supabaseServer
    .from("device_commands")
    .insert({
      device_id: device.device_id,
      command: { command: "REMOVEWIFI", ssid: ssid.trim() },
      status: "pending",
    });

  if (insertError) {
    return apiError(req, 500, "SUPABASE_ERROR", insertError.message);
  }

  logRequestEnd(req, startedAt, 200, { device_id: device.device_id });
  return NextResponse.json({ ok: true, device_id: device.device_id });
}
