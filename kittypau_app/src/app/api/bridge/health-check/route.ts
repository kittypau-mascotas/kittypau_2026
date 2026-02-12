import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, logRequestEnd, startRequestTimer } from "../../_utils";

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

  const staleMinutes = Number(req.nextUrl.searchParams.get("stale_min") ?? "5");
  const staleMs = Number.isFinite(staleMinutes)
    ? Math.max(1, staleMinutes) * 60_000
    : 5 * 60_000;
  const cutoff = new Date(Date.now() - staleMs).toISOString();

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
    await supabaseServer.from("bridge_telemetry").insert(
      offlineBridgeIds.map((bridgeId) => ({
        device_id: bridgeId,
        device_type: "bridge",
        bridge_status: "offline",
        recorded_at: new Date().toISOString(),
      }))
    );
  }

  const ok = offline.length === 0 && (data?.length ?? 0) > 0;
  logRequestEnd(req, startedAt, 200, { ok, offline_count: offline.length });

  return NextResponse.json(
    {
      ok,
      stale_min: staleMinutes,
      offline_count: offline.length,
      bridges: data ?? [],
      offline,
    },
    { status: 200 }
  );
}
