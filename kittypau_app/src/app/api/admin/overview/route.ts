import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, getUserClient, logRequestEnd, startRequestTimer } from "../../_utils";

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;

  const { data: adminRole, error: roleError } = await supabaseServer
    .from("admin_roles")
    .select("role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (roleError) {
    return apiError(req, 500, "SUPABASE_ERROR", roleError.message);
  }
  if (!adminRole) {
    return apiError(req, 403, "FORBIDDEN", "Admin role required");
  }

  const auditLimit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("audit_limit") ?? 30), 1),
    100
  );
  const offlineLimit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("offline_limit") ?? 20), 1),
    100
  );

  const staleCutoff = new Date(Date.now() - 10 * 60_000).toISOString();

  const [
    { data: summary, error: summaryError },
    { data: auditEvents, error: auditError },
    { data: bridges, error: bridgesError },
    { data: offlineDevices, error: offlineError },
    { data: incidentWindowEvents, error: incidentError },
  ] = await Promise.all([
      supabaseServer.from("admin_dashboard_live").select("*").limit(1).maybeSingle(),
      supabaseServer
        .from("audit_events")
        .select("id, event_type, actor_id, entity_type, entity_id, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(auditLimit),
      supabaseServer
        .from("bridge_status_live")
        .select(
          "device_id, bridge_status, wifi_ip, hostname, last_seen, kpcl_total_devices, kpcl_online_devices, kpcl_offline_devices"
        )
        .order("last_seen", { ascending: false }),
      supabaseServer
        .from("devices")
        .select("id, device_id, device_state, status, last_seen, battery_level, owner_id")
        .ilike("device_id", "KPCL%")
        .is("retired_at", null)
        .or(`last_seen.is.null,last_seen.lt.${staleCutoff}`)
        .order("last_seen", { ascending: true, nullsFirst: true })
        .limit(offlineLimit),
      supabaseServer
        .from("audit_events")
        .select("event_type, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .in("event_type", [
          "bridge_offline_detected",
          "device_offline_detected",
          "general_device_outage_detected",
          "general_device_outage_recovered",
        ]),
    ]);

  if (summaryError) {
    return apiError(req, 500, "SUPABASE_ERROR", summaryError.message);
  }
  if (auditError) {
    return apiError(req, 500, "SUPABASE_ERROR", auditError.message);
  }
  if (bridgesError) {
    return apiError(req, 500, "SUPABASE_ERROR", bridgesError.message);
  }
  if (offlineError) {
    return apiError(req, 500, "SUPABASE_ERROR", offlineError.message);
  }
  if (incidentError) {
    return apiError(req, 500, "SUPABASE_ERROR", incidentError.message);
  }

  const incidentCounters = {
    bridge_offline_detected: 0,
    device_offline_detected: 0,
    general_device_outage_detected: 0,
    general_device_outage_recovered: 0,
  };
  for (const row of incidentWindowEvents ?? []) {
    const key = row.event_type as keyof typeof incidentCounters;
    if (key in incidentCounters) incidentCounters[key] += 1;
  }

  const activeGeneralOutage =
    incidentCounters.general_device_outage_detected >
    incidentCounters.general_device_outage_recovered;

  logRequestEnd(req, startedAt, 200, {
    admin_role: adminRole.role,
    audit_count: auditEvents?.length ?? 0,
    bridge_count: bridges?.length ?? 0,
    offline_device_count: offlineDevices?.length ?? 0,
  });

  return NextResponse.json({
    admin_role: adminRole.role,
    summary: summary ?? null,
    audit_events: auditEvents ?? [],
    bridges: bridges ?? [],
    offline_devices: offlineDevices ?? [],
    incident_counters: incidentCounters,
    active_general_outage: activeGeneralOutage,
    stale_cutoff: staleCutoff,
  });
}
