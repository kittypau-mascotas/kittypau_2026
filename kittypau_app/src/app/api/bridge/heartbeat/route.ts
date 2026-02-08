import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, enforceBodySize, logRequestEnd, startRequestTimer } from "../_utils";

type HeartbeatPayload = {
  bridge_id?: string;
  ip?: string;
  uptime_sec?: number;
  mqtt_connected?: boolean;
  last_mqtt_at?: string;
};

function normalizeString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const token = req.headers.get("x-bridge-token");
  if (!token || token !== process.env.BRIDGE_HEARTBEAT_SECRET) {
    return apiError(req, 401, "UNAUTHORIZED", "Unauthorized");
  }

  let payload: HeartbeatPayload;
  try {
    const sizeError = enforceBodySize(req, 4_000);
    if (sizeError) return sizeError;
    payload = (await req.json()) as HeartbeatPayload;
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON");
  }

  const bridgeId = normalizeString(payload.bridge_id);
  if (!bridgeId) {
    return apiError(req, 400, "MISSING_BRIDGE_ID", "bridge_id is required");
  }

  const ip =
    normalizeString(payload.ip) ??
    normalizeString(req.headers.get("x-forwarded-for")) ??
    null;

  const uptimeSec =
    typeof payload.uptime_sec === "number" && Number.isFinite(payload.uptime_sec)
      ? Math.max(0, Math.floor(payload.uptime_sec))
      : null;

  const mqttConnected =
    typeof payload.mqtt_connected === "boolean" ? payload.mqtt_connected : null;

  const lastMqttAt = payload.last_mqtt_at
    ? new Date(payload.last_mqtt_at).toISOString()
    : null;

  const { data, error } = await supabaseServer
    .from("bridge_heartbeats")
    .upsert(
      {
        bridge_id: bridgeId,
        ip,
        uptime_sec: uptimeSec,
        mqtt_connected: mqttConnected,
        last_mqtt_at: lastMqttAt,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "bridge_id" }
    )
    .select()
    .single();

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  logRequestEnd(req, startedAt, 200, { bridge_id: bridgeId });
  return NextResponse.json({ ok: true, bridge_id: bridgeId }, { status: 200 });
}
