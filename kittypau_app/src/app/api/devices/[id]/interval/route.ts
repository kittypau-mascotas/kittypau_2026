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

const VALID_INTERVALS_MS = [
  1_000, 5_000, 15_000, 30_000,
  60_000, 300_000, 1_500_000, 1_800_000,
  3_600_000, 7_200_000, 14_400_000, 21_600_000,
  43_200_000, 86_400_000, 604_800_000,
];

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
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:interval`;
  const rate = await checkRateLimit(rateKey, 10, 60_000);
  if (!rate.ok) {
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const value_ms = Number(body?.value_ms);

  if (!VALID_INTERVALS_MS.includes(value_ms)) {
    return apiError(req, 400, "INVALID_INTERVAL", "Intervalo no válido");
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
      command: { command: "SET_INTERVAL", value_ms },
      status: "pending",
    });

  if (insertError) {
    return apiError(req, 500, "SUPABASE_ERROR", insertError.message);
  }

  logRequestEnd(req, startedAt, 200, { device_id: device.device_id, value_ms });
  return NextResponse.json({ ok: true, device_id: device.device_id, value_ms });
}
