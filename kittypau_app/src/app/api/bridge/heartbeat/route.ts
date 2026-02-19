import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, enforceBodySize, logRequestEnd, startRequestTimer } from "../../_utils";
import { logAudit } from "../../_audit";
import { bumpAdminOverviewCacheVersion } from "../../_cache";

type HeartbeatPayload = {
  bridge_id?: string;
  ip?: string;
  uptime_sec?: number;
  mqtt_connected?: boolean;
  last_mqtt_at?: string;
  device_model?: string;
  hostname?: string;
  wifi_ssid?: string;
  wifi_ip?: string;
  ram_used_mb?: number;
  ram_total_mb?: number;
  disk_used_pct?: number;
  cpu_temp?: number;
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

  const bridgeStatus =
    mqttConnected === false ? "degraded" : "active";

  const { data: lastStatusRow } = await supabaseServer
    .from("bridge_telemetry")
    .select("bridge_status")
    .eq("device_id", bridgeId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const previousStatus = lastStatusRow?.bridge_status ?? null;

  // Keep bridge telemetry status in sync with latest heartbeat.
  await supabaseServer.from("bridge_telemetry").insert({
    device_id: bridgeId,
    device_type: "bridge",
    device_model: normalizeString(payload.device_model),
    hostname: normalizeString(payload.hostname),
    wifi_ssid: normalizeString(payload.wifi_ssid),
    wifi_ip: normalizeString(payload.wifi_ip) ?? ip,
    uptime_min:
      uptimeSec !== null ? Math.max(0, Math.floor(uptimeSec / 60)) : null,
    ram_used_mb:
      typeof payload.ram_used_mb === "number" && Number.isFinite(payload.ram_used_mb)
        ? Math.max(0, Math.floor(payload.ram_used_mb))
        : null,
    ram_total_mb:
      typeof payload.ram_total_mb === "number" && Number.isFinite(payload.ram_total_mb)
        ? Math.max(0, Math.floor(payload.ram_total_mb))
        : null,
    disk_used_pct:
      typeof payload.disk_used_pct === "number" && Number.isFinite(payload.disk_used_pct)
        ? Math.max(0, Math.floor(payload.disk_used_pct))
        : null,
    cpu_temp:
      typeof payload.cpu_temp === "number" && Number.isFinite(payload.cpu_temp)
        ? payload.cpu_temp
        : null,
    bridge_status: bridgeStatus,
    recorded_at: new Date().toISOString(),
  });

  if (previousStatus !== bridgeStatus) {
    await logAudit({
      event_type: "bridge_status_changed",
      entity_type: "bridge",
      payload: {
        bridge_id: bridgeId,
        previous_status: previousStatus,
        next_status: bridgeStatus,
        source: "heartbeat",
      },
    });
  }

  await bumpAdminOverviewCacheVersion();

  logRequestEnd(req, startedAt, 200, { bridge_id: bridgeId });
  return NextResponse.json({ ok: true, bridge_id: bridgeId }, { status: 200 });
}
