import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, logRequestEnd, startRequestTimer } from "../../_utils";
import { logAudit } from "../../_audit";

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const bridgeToken = req.headers.get("x-bridge-token");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const isBridgeAuth =
    !!bridgeToken && bridgeToken === process.env.BRIDGE_HEARTBEAT_SECRET;
  const isCronAuth =
    !!bearerToken &&
    !!process.env.CRON_SECRET &&
    bearerToken === process.env.CRON_SECRET;

  if (!isBridgeAuth && !isCronAuth) {
    return apiError(req, 401, "UNAUTHORIZED", "Unauthorized");
  }

  const staleMinutes = Number(req.nextUrl.searchParams.get("stale_min") ?? "10");
  const staleMs = Number.isFinite(staleMinutes)
    ? Math.max(1, staleMinutes) * 60_000
    : 10 * 60_000;
  const cutoff = new Date(Date.now() - staleMs).toISOString();
  const deviceStaleMinutes = Number(
    req.nextUrl.searchParams.get("device_stale_min") ?? "10"
  );
  const deviceStaleMs = Number.isFinite(deviceStaleMinutes)
    ? Math.max(1, deviceStaleMinutes) * 60_000
    : 5 * 60_000;
  const deviceCutoff = new Date(Date.now() - deviceStaleMs).toISOString();

  const { data, error } = await supabaseServer
    .from("bridge_heartbeats")
    .select("bridge_id, last_seen, mqtt_connected, last_mqtt_at, uptime_sec, ip")
    .order("last_seen", { ascending: false });

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const offline = (data ?? []).filter((row) => {
    const lastSeen = row.last_seen ? new Date(row.last_seen).toISOString() : null;
    return !lastSeen || lastSeen < cutoff;
  });

  const offlineBridgeIds = offline
    .map((row) => row.bridge_id)
    .filter((id): id is string => /^KPBR\d{4}$/.test(id));

  if (offlineBridgeIds.length > 0) {
    for (const bridgeId of offlineBridgeIds) {
      const { data: lastStatusRow } = await supabaseServer
        .from("bridge_telemetry")
        .select("bridge_status")
        .eq("device_id", bridgeId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastStatusRow?.bridge_status === "offline") continue;

      await supabaseServer.from("bridge_telemetry").insert({
        device_id: bridgeId,
        device_type: "bridge",
        bridge_status: "offline",
        recorded_at: new Date().toISOString(),
      });

      await logAudit({
        event_type: "bridge_offline_detected",
        entity_type: "bridge",
        payload: {
          bridge_id: bridgeId,
          previous_status: lastStatusRow?.bridge_status ?? null,
          next_status: "offline",
          source: "health_check",
          message: `Bridge ${bridgeId} se apagó o perdió conexión.`,
        },
      });
    }
  }

  const { data: kpclDevices, error: kpclDevicesError } = await supabaseServer
    .from("devices")
    .select("id, device_id, device_state, last_seen, retired_at")
    .ilike("device_id", "KPCL%")
    .is("retired_at", null);

  if (kpclDevicesError) {
    return apiError(req, 500, "SUPABASE_ERROR", kpclDevicesError.message);
  }

  const staleDevices = (kpclDevices ?? []).filter((device) => {
    if (!device.last_seen) return true;
    return new Date(device.last_seen).toISOString() < deviceCutoff;
  });

  const transitionedOfflineDevices: string[] = [];
  for (const device of staleDevices) {
    if (device.device_state === "offline") continue;

    const { error: updateDeviceError } = await supabaseServer
      .from("devices")
      .update({ device_state: "offline" })
      .eq("id", device.id);
    if (updateDeviceError) continue;

    transitionedOfflineDevices.push(device.device_id);
    await logAudit({
      event_type: "device_offline_detected",
      entity_type: "device",
      entity_id: device.id,
      payload: {
        device_id: device.device_id,
        previous_state: device.device_state,
        next_state: "offline",
        source: "health_check",
        message: `Plato/sensor ${device.device_id} se apagó o perdió conexión.`,
      },
    });
  }

  const total = (kpclDevices ?? []).length;
  const offlineNowDevices = (kpclDevices ?? []).filter((device) => {
    if (device.device_state === "offline") return true;
    if (!device.last_seen) return true;
    return new Date(device.last_seen).toISOString() < deviceCutoff;
  });
  const offlineNowIds = offlineNowDevices.map((device) => device.device_id);
  const offlineCount = offlineNowIds.length;
  const onlineCount = Math.max(0, total - offlineCount);
  const outageByCount = offlineCount >= 3;
  const outageByRatio = total > 0 && offlineCount / total >= 0.6;
  const generalOutage = outageByCount || outageByRatio;

  const { data: lastOutageEvent } = await supabaseServer
    .from("audit_events")
    .select("event_type, created_at")
    .in("event_type", [
      "general_device_outage_detected",
      "general_device_outage_recovered",
    ])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastEventType = lastOutageEvent?.event_type ?? null;
  if (generalOutage && lastEventType !== "general_device_outage_detected") {
    await logAudit({
      event_type: "general_device_outage_detected",
      entity_type: "system",
      payload: {
        source: "health_check",
        message: "Falla general detectada en dispositivos KPCL.",
        total_devices: total,
        stale_devices: offlineCount,
      },
    });
  } else if (!generalOutage && lastEventType === "general_device_outage_detected") {
    await logAudit({
      event_type: "general_device_outage_recovered",
      entity_type: "system",
      payload: {
        source: "health_check",
        message: "Recuperación de falla general en dispositivos KPCL.",
        total_devices: total,
        stale_devices: offlineCount,
      },
    });
  }

  const ok = offline.length === 0 && (data?.length ?? 0) > 0;
  logRequestEnd(req, startedAt, 200, {
    ok,
    offline_count: offline.length,
    kpcl_total: total,
    kpcl_online: onlineCount,
    kpcl_offline: offlineCount,
  });

  return NextResponse.json(
    {
      ok,
      stale_min: staleMinutes,
      offline_count: offline.length,
      device_stale_min: deviceStaleMinutes,
      kpcl_total_devices: total,
      kpcl_online_devices: onlineCount,
      kpcl_offline_devices: offlineCount,
      offline_devices_count: offlineNowIds.length,
      offline_devices_transitioned_count: transitionedOfflineDevices.length,
      bridges: data ?? [],
      offline,
      offline_devices: offlineNowIds,
      offline_devices_transitioned: transitionedOfflineDevices,
    },
    { status: 200 }
  );
}
