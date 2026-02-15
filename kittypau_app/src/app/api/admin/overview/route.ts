import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, getUserClient, logRequestEnd, startRequestTimer } from "../../_utils";

type RegistrationStage =
  | "profile_pending"
  | "pet_pending"
  | "device_pending"
  | "completed";

function toRegistrationStage(params: {
  userStep: string | null;
  hasPet: boolean;
  hasDevice: boolean;
}): RegistrationStage {
  const userStep = params.userStep ?? "not_started";
  if (userStep === "completed" && params.hasPet && params.hasDevice) {
    return "completed";
  }
  if (
    userStep === "not_started" ||
    userStep === "user_profile" ||
    userStep === ""
  ) {
    return "profile_pending";
  }
  if (!params.hasPet || userStep === "pet_profile") {
    return "pet_pending";
  }
  if (!params.hasDevice || userStep === "device_link") {
    return "device_pending";
  }
  return "profile_pending";
}

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
  const auditTypeParam = req.nextUrl.searchParams.get("audit_type");
  const auditType =
    auditTypeParam && auditTypeParam.trim().length ? auditTypeParam.trim() : null;
  const auditWindowMin = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("audit_window_min") ?? 0), 0),
    24 * 60
  );
  const auditDedupWindowSec = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("audit_dedup_sec") ?? 30), 0),
    300
  );
  const offlineLimit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("offline_limit") ?? 20), 1),
    100
  );

  const staleCutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const auditSince =
    auditWindowMin > 0
      ? new Date(Date.now() - auditWindowMin * 60_000).toISOString()
      : null;

  const [
    { data: summary, error: summaryError },
    { data: auditEvents, error: auditError },
    { data: bridges, error: bridgesError },
    { data: offlineDevices, error: offlineError },
    { data: incidentWindowEvents, error: incidentError },
    { data: profiles, error: profilesError },
    { data: petOwners, error: petOwnersError },
    { data: deviceOwners, error: deviceOwnersError },
  ] = await Promise.all([
      supabaseServer.from("admin_dashboard_live").select("*").limit(1).maybeSingle(),
      (() => {
        let query = supabaseServer
          .from("audit_events")
          .select("id, event_type, actor_id, entity_type, entity_id, payload, created_at")
          .order("created_at", { ascending: false })
          .limit(auditLimit);
        if (auditSince) query = query.gte("created_at", auditSince);
        if (auditType) query = query.eq("event_type", auditType);
        return query;
      })(),
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
      supabaseServer
        .from("profiles")
        .select("id, user_name, city, user_onboarding_step, created_at"),
      supabaseServer
        .from("pets")
        .select("user_id"),
      supabaseServer
        .from("devices")
        .select("owner_id")
        .not("owner_id", "is", null),
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
  if (profilesError) {
    return apiError(req, 500, "SUPABASE_ERROR", profilesError.message);
  }
  if (petOwnersError) {
    return apiError(req, 500, "SUPABASE_ERROR", petOwnersError.message);
  }
  if (deviceOwnersError) {
    return apiError(req, 500, "SUPABASE_ERROR", deviceOwnersError.message);
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

  const ownersWithPet = new Set((petOwners ?? []).map((row) => row.user_id));
  const ownersWithDevice = new Set((deviceOwners ?? []).map((row) => row.owner_id));
  const nowMs = Date.now();
  const registrationRows = (profiles ?? []).map((row) => {
    const hasPet = ownersWithPet.has(row.id);
    const hasDevice = ownersWithDevice.has(row.id);
    const stage = toRegistrationStage({
      userStep: row.user_onboarding_step ?? null,
      hasPet,
      hasDevice,
    });
    return {
      id: row.id,
      user_name: row.user_name ?? null,
      city: row.city ?? null,
      user_step: row.user_onboarding_step ?? null,
      created_at: row.created_at,
      stage,
    };
  });
  const registrationSummary = (() => {
    let completed = 0;
    let pendingProfile = 0;
    let pendingPet = 0;
    let pendingDevice = 0;
    let stalled24h = 0;
    const pending: typeof registrationRows = [];

    for (const row of registrationRows) {
      if (row.stage === "completed") {
        completed += 1;
        continue;
      }
      pending.push(row);
      if (row.stage === "profile_pending") pendingProfile += 1;
      if (row.stage === "pet_pending") pendingPet += 1;
      if (row.stage === "device_pending") pendingDevice += 1;
      const ageMs = nowMs - Date.parse(row.created_at ?? "");
      if (Number.isFinite(ageMs) && ageMs > 24 * 60 * 60 * 1000) {
        stalled24h += 1;
      }
    }

    pending.sort(
      (a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "")
    );

    return {
      total_profiles: registrationRows.length,
      completed,
      pending_total: pending.length,
      pending_profile: pendingProfile,
      pending_pet: pendingPet,
      pending_device: pendingDevice,
      stalled_24h: stalled24h,
      pending_recent: pending.slice(0, 8),
    };
  })();

  const dedupedAuditEvents = (() => {
    if (!auditDedupWindowSec) return auditEvents ?? [];
    const out: typeof auditEvents = [];
    const lastByKey = new Map<string, number>();
    for (const row of auditEvents ?? []) {
      const key = `${row.event_type}:${row.entity_type ?? ""}:${row.entity_id ?? ""}`;
      const ts = Date.parse(row.created_at);
      if (!Number.isFinite(ts)) {
        out.push(row);
        continue;
      }
      const last = lastByKey.get(key);
      if (last !== undefined && Math.abs(last - ts) < auditDedupWindowSec * 1000) {
        continue;
      }
      lastByKey.set(key, ts);
      out.push(row);
    }
    return out;
  })();

  logRequestEnd(req, startedAt, 200, {
    admin_role: adminRole.role,
    audit_count: dedupedAuditEvents?.length ?? 0,
    bridge_count: bridges?.length ?? 0,
    offline_device_count: offlineDevices?.length ?? 0,
    registration_pending: registrationSummary.pending_total,
  });

  return NextResponse.json({
    admin_role: adminRole.role,
    summary: summary ?? null,
    audit_events: dedupedAuditEvents ?? [],
    bridges: bridges ?? [],
    offline_devices: offlineDevices ?? [],
    incident_counters: incidentCounters,
    active_general_outage: activeGeneralOutage,
    registration_summary: registrationSummary,
    stale_cutoff: staleCutoff,
  });
}
