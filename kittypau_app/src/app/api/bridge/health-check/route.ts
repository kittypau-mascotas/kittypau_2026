import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, logRequestEnd, startRequestTimer } from "../../_utils";

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const token = req.headers.get("x-bridge-token");
  if (!token || token !== process.env.BRIDGE_HEARTBEAT_SECRET) {
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
