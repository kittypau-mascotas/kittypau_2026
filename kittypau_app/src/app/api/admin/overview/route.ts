import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, getUserClient, logRequestEnd, startRequestTimer } from "../../_utils";
import { getAdminOverviewCacheVersion, getCacheJson, setCacheJson } from "../../_cache";
import {
  DEFAULT_KPCL_COST_CATALOG,
  type KpclCatalog,
} from "@/lib/finance/kpcl-catalog";

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

type AdminObjectStat = {
  schema_name: string;
  object_name: string;
  object_type: string;
  description: string | null;
  row_estimate: number | null;
  size_bytes: number | null;
  size_pretty: string | null;
  last_updated_at: string | null;
};

type FinanceSummaryRow = {
  generated_at: string;
  bom_unit_cost_usd: number | null;
  cloud_monthly_cost_usd: number | null;
  providers_json: unknown;
  snapshot_month: string | null;
  units_produced: number | null;
  total_cost_usd: number | null;
  unit_cost_usd: number | null;
};

type FinanceMonthlySnapshotRow = {
  snapshot_month: string;
  units_produced: number;
  bom_cost_total_usd: number;
  manufacturing_cost_total_usd: number;
  cloud_cost_total_usd: number;
  logistics_cost_total_usd: number;
  support_cost_total_usd: number;
  warranty_cost_total_usd: number;
  total_cost_usd: number;
  unit_cost_usd: number;
  updated_at: string;
};

type FinanceProviderRow = {
  provider: string;
  plan_name: string;
  is_free_plan: boolean;
  is_active: boolean;
  monthly_cost_usd: number;
  limit_label: string | null;
  usage_label: string | null;
  updated_at: string;
};

type VercelUsageSummary = {
  provider: "vercel";
  team_id: string | null;
  project_id: string | null;
  plan_name: string | null;
  deployments_30d: number | null;
  used_percent: number | null;
  period_start: string | null;
  period_end: string | null;
  source: string;
};

type KpclCatalogProfileRow = {
  profile_key: string;
  label: string;
  print_grams: number;
  print_hours: number;
  print_unit_cost_usd: number;
  maintenance_monthly_usd: number;
  power_monthly_usd: number;
};

type KpclCatalogComponentRow = {
  profile_key: string;
  component_code: string;
  component_name: string;
  qty: number;
  unit_cost_usd: number;
  notes: string | null;
  sort_order: number | null;
};

function toIsoOrNull(input: unknown): string | null {
  if (typeof input === "string" && input.trim()) return input;
  if (typeof input === "number" && Number.isFinite(input)) {
    return new Date(input).toISOString();
  }
  return null;
}

async function fetchVercelUsageSummary(): Promise<VercelUsageSummary | null> {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim() ?? null;
  const teamIdEnv = process.env.VERCEL_TEAM_ID?.trim() ?? null;
  const teamSlug = process.env.VERCEL_TEAM_SLUG?.trim() ?? null;
  if (!token) return null;

  const headers = { Authorization: `Bearer ${token}` };

  let teamId = teamIdEnv;
  if (!teamId && teamSlug) {
    const teamRes = await fetch(
      `https://api.vercel.com/v2/teams/${encodeURIComponent(teamSlug)}`,
      { headers, cache: "no-store" }
    );
    if (teamRes.ok) {
      const teamJson = (await teamRes.json()) as Record<string, unknown>;
      const id = teamJson?.id;
      if (typeof id === "string" && id) teamId = id;
    }
  }

  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const now = Date.now();
  const from = now - 30 * 24 * 60 * 60 * 1000;

  let deployments30d: number | null = null;
  if (projectId) {
    const depUrl =
      `https://api.vercel.com/v6/deployments` +
      `${query ? `${query}&` : "?"}projectId=${encodeURIComponent(projectId)}&from=${from}&to=${now}&limit=1`;
    const depRes = await fetch(depUrl, { headers, cache: "no-store" });
    if (depRes.ok) {
      const depJson = (await depRes.json()) as Record<string, unknown>;
      const pagination = depJson?.pagination as Record<string, unknown> | undefined;
      const count = pagination?.count;
      if (typeof count === "number" && Number.isFinite(count)) {
        deployments30d = count;
      }
    }
  }

  let planName: string | null = null;
  let usedPercent: number | null = null;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let source = "api.v6.deployments";

  const usageRes = await fetch(`https://api.vercel.com/v1/usage${query}`, {
    headers,
    cache: "no-store",
  });
  if (usageRes.ok) {
    const usageJson = (await usageRes.json()) as Record<string, unknown>;
    const plan =
      (usageJson?.plan as Record<string, unknown> | undefined)?.name ??
      usageJson?.plan;
    if (typeof plan === "string" && plan) planName = plan;

    const pctCandidates = [
      usageJson?.usedPercent,
      usageJson?.used_percent,
      (usageJson?.totals as Record<string, unknown> | undefined)?.usedPercent,
      (usageJson?.totals as Record<string, unknown> | undefined)?.used_percent,
    ];
    const pct = pctCandidates.find((v) => typeof v === "number") as number | undefined;
    if (typeof pct === "number" && Number.isFinite(pct)) {
      usedPercent = Number(Math.max(0, Math.min(100, pct)).toFixed(2));
    }

    periodStart =
      toIsoOrNull(usageJson?.from) ??
      toIsoOrNull((usageJson?.period as Record<string, unknown> | undefined)?.from);
    periodEnd =
      toIsoOrNull(usageJson?.to) ??
      toIsoOrNull((usageJson?.period as Record<string, unknown> | undefined)?.to);
    source = "api.v1.usage";
  }

  return {
    provider: "vercel",
    team_id: teamId,
    project_id: projectId,
    plan_name: planName,
    deployments_30d: deployments30d,
    used_percent: usedPercent,
    period_start: periodStart,
    period_end: periodEnd,
    source,
  };
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
  const noCache = req.nextUrl.searchParams.get("no_cache") === "1";
  const ttlRaw = Number(process.env.ADMIN_OVERVIEW_CACHE_TTL_SEC);
  const cacheTtlSec = Math.min(
    Math.max(Number.isFinite(ttlRaw) ? ttlRaw : 45, 0),
    300
  );
  const cacheVersion = await getAdminOverviewCacheVersion();
  const cacheKey = [
    "admin:overview",
    `v:${cacheVersion}`,
    `w:${auditWindowMin}`,
    `t:${auditType ?? "all"}`,
    `d:${auditDedupWindowSec}`,
    `o:${offlineLimit}`,
  ].join(":");

  if (!noCache && cacheTtlSec > 0) {
    const cached = await getCacheJson<Record<string, unknown>>(cacheKey);
    if (cached) {
      const payload = {
        ...cached,
        admin_role: adminRole.role,
      };
      logRequestEnd(req, startedAt, 200, {
        admin_role: adminRole.role,
        cache: "hit",
      });
      return NextResponse.json(payload, {
        status: 200,
        headers: { "x-admin-cache": "HIT" },
      });
    }
  }

  const staleCutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const auditSince =
    auditWindowMin > 0
      ? new Date(Date.now() - auditWindowMin * 60_000).toISOString()
      : null;

  const readAllReadingsForDevices = async (deviceIds: string[]) => {
    const out: Array<Record<string, unknown>> = [];
    if (!deviceIds.length) return { data: out, error: null as string | null };
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabaseServer
        .from("readings")
        .select(
          "id, device_id, pet_id, weight_grams, water_ml, temperature, humidity, battery_level, recorded_at, flow_rate, ingested_at, clock_invalid, light_lux, light_percent, light_condition, device_timestamp"
        )
        .in("device_id", deviceIds)
        .order("recorded_at", { ascending: true })
        .range(from, to);
      if (error) return { data: out, error: error.message };
      if (!data?.length) break;
      out.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
      if (from > 200_000) break;
    }
    return { data: out, error: null as string | null };
  };

  const [
    { data: summary, error: summaryError },
    { data: auditEvents, error: auditError },
    { data: bridges, error: bridgesError },
    { data: offlineDevices, error: offlineError },
    { data: incidentWindowEvents, error: incidentError },
    { data: profiles, error: profilesError },
    { data: petOwners, error: petOwnersError },
    { data: deviceOwners, error: deviceOwnersError },
    { data: kpclDevices, error: kpclDevicesError },
    { data: recentReadings, error: recentReadingsError },
    { data: deviceStateEvents, error: deviceStateEventsError },
    { data: storageObjects, error: storageObjectsError },
    { data: objectStats, error: objectStatsError },
    { data: financeSummaryRow, error: financeSummaryError },
    { data: financeProviders, error: financeProvidersError },
    { data: financeMonthlySnapshotRow, error: financeMonthlySnapshotError },
    { data: kpclCatalogProfiles, error: kpclCatalogProfilesError },
    { data: kpclCatalogComponents, error: kpclCatalogComponentsError },
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
        .select(
          "id, device_id, device_type, device_model, device_state, status, last_seen, battery_level, owner_id, wifi_status, wifi_ip, sensor_health"
        )
        .ilike("device_id", "KPCL%")
        .is("retired_at", null)
        .or(`device_state.eq.offline,last_seen.is.null,last_seen.lt.${staleCutoff}`)
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
      supabaseServer
        .from("devices")
        .select(
          "id, device_id, device_type, device_model, device_state, status, last_seen, battery_level, owner_id, wifi_status, wifi_ip, sensor_health"
        )
        .ilike("device_id", "KPCL%")
        .is("retired_at", null)
        .order("device_id", { ascending: true }),
      supabaseServer
        .from("readings")
        .select(
          "id, device_id, pet_id, weight_grams, water_ml, temperature, humidity, battery_level, recorded_at, flow_rate, ingested_at, clock_invalid, light_lux, light_percent, light_condition, device_timestamp"
        )
        .gte("recorded_at", new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())
        .order("recorded_at", { ascending: true }),
      supabaseServer
        .from("audit_events")
        .select("event_type, payload, created_at")
        .in("event_type", ["device_offline_detected", "device_online_detected"])
        .gte("created_at", new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true }),
      supabaseServer.schema("storage").from("objects").select("id, metadata"),
      supabaseServer
        .from("admin_object_stats_live")
        .select(
          "schema_name, object_name, object_type, description, row_estimate, size_bytes, size_pretty, last_updated_at"
        ),
      supabaseServer
        .from("finance_admin_summary")
        .select(
          "generated_at, bom_unit_cost_usd, cloud_monthly_cost_usd, providers_json, snapshot_month, units_produced, total_cost_usd, unit_cost_usd"
        )
        .limit(1)
        .maybeSingle(),
      supabaseServer
        .from("finance_provider_plans")
        .select(
          "provider, plan_name, is_free_plan, is_active, monthly_cost_usd, limit_label, usage_label, updated_at"
        )
        .eq("is_active", true)
        .order("provider", { ascending: true }),
      supabaseServer
        .from("finance_monthly_snapshots")
        .select(
          "snapshot_month, units_produced, bom_cost_total_usd, manufacturing_cost_total_usd, cloud_cost_total_usd, logistics_cost_total_usd, support_cost_total_usd, warranty_cost_total_usd, total_cost_usd, unit_cost_usd, updated_at"
        )
        .order("snapshot_month", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseServer
        .from("finance_kpcl_profiles")
        .select(
          "profile_key, label, print_grams, print_hours, print_unit_cost_usd, maintenance_monthly_usd, power_monthly_usd"
        )
        .eq("active", true)
        .order("profile_key", { ascending: true }),
      supabaseServer
        .from("finance_kpcl_profile_components")
        .select(
          "profile_key, component_code, component_name, qty, unit_cost_usd, notes, sort_order"
        )
        .order("profile_key", { ascending: true })
        .order("sort_order", { ascending: true }),
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
  if (kpclDevicesError) {
    return apiError(req, 500, "SUPABASE_ERROR", kpclDevicesError.message);
  }
  if (recentReadingsError) {
    return apiError(req, 500, "SUPABASE_ERROR", recentReadingsError.message);
  }
  if (deviceStateEventsError) {
    return apiError(req, 500, "SUPABASE_ERROR", deviceStateEventsError.message);
  }
  let effectiveObjectStats = objectStats ?? [];
  if (objectStatsError) {
    console.warn("[admin_overview] object_stats_view_unavailable", {
      message: objectStatsError.message,
    });
    const { data: objectStatsFallback, error: objectStatsFallbackError } =
      await supabaseServer.rpc("admin_object_stats");
    if (objectStatsFallbackError) {
      console.warn("[admin_overview] object_stats_rpc_unavailable", {
        message: objectStatsFallbackError.message,
      });
      effectiveObjectStats = [];
    } else {
      effectiveObjectStats = (objectStatsFallback ?? []) as AdminObjectStat[];
    }
  }
  if (financeSummaryError) {
    console.warn("[admin_overview] finance_summary_unavailable", {
      message: financeSummaryError.message,
    });
  }
  if (financeProvidersError) {
    console.warn("[admin_overview] finance_providers_unavailable", {
      message: financeProvidersError.message,
    });
  }
  if (kpclCatalogProfilesError) {
    console.warn("[admin_overview] kpcl_catalog_profiles_unavailable", {
      message: kpclCatalogProfilesError.message,
    });
  }
  if (kpclCatalogComponentsError) {
    console.warn("[admin_overview] kpcl_catalog_components_unavailable", {
      message: kpclCatalogComponentsError.message,
    });
  }
  // Storage usage is informative only; don't break admin overview if storage metadata fails.
  if (storageObjectsError) {
    console.warn("[admin_overview] storage_objects_unavailable", {
      message: storageObjectsError.message,
    });
  }

  const safeStorageObjects = storageObjectsError ? [] : (storageObjects ?? []);

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

  const kpclStatus = (kpclDevices ?? []).map((device) => {
    const lastSeenTs = device.last_seen ? Date.parse(device.last_seen) : NaN;
    const isFresh = Number.isFinite(lastSeenTs)
      ? lastSeenTs >= Date.parse(staleCutoff)
      : false;
    const isOnline = device.device_state !== "offline" && isFresh;
    return {
      ...device,
      is_online: isOnline,
    };
  });

  const lifetimeReadingsResult = await readAllReadingsForDevices(
    (kpclDevices ?? []).map((d) => d.id)
  );
  if (lifetimeReadingsResult.error) {
    return apiError(req, 500, "SUPABASE_ERROR", lifetimeReadingsResult.error);
  }
  const lifetimeReadings = lifetimeReadingsResult.data;

  const kpclTotalsOrigin = (() => {
    const hourMs = 60 * 60 * 1000;
    const codeById = new Map<string, string>(
      (kpclDevices ?? []).map((d) => [d.id, d.device_id])
    );
    const hoursByCode = new Map<string, Set<number>>();
    const bytesByCode = new Map<string, number>();
    const encoder = new TextEncoder();
    for (const row of lifetimeReadings) {
      const deviceId = String(row.device_id ?? "");
      const code = codeById.get(deviceId);
      if (!code) continue;
      const recordedAt = row.recorded_at;
      const ts = typeof recordedAt === "string" ? Date.parse(recordedAt) : NaN;
      if (!Number.isFinite(ts)) continue;
      const hourKey = Math.floor(ts / hourMs) * hourMs;
      if (!hoursByCode.has(code)) hoursByCode.set(code, new Set<number>());
      hoursByCode.get(code)!.add(hourKey);
      const rowBytes = encoder.encode(JSON.stringify(row)).length;
      bytesByCode.set(code, (bytesByCode.get(code) ?? 0) + rowBytes);
    }
    return kpclStatus.map((device) => {
      const totalHours = hoursByCode.get(device.device_id)?.size ?? 0;
      const totalMb = (bytesByCode.get(device.device_id) ?? 0) / (1024 * 1024);
      return {
        device_id: device.device_id,
        online_hours_total: totalHours,
        data_mb_total: Number(totalMb.toFixed(2)),
      };
    });
  })();

  const kpclDeviceHourlyStatus = (() => {
    const hourMs = 60 * 60 * 1000;
    const totalHours = 28 * 24;
    const nowHour = Math.floor(Date.now() / hourMs) * hourMs;
    const windowStart = nowHour - (totalHours - 1) * hourMs;
    const windowEnd = nowHour + hourMs;

    const codeById = new Map<string, string>((kpclDevices ?? []).map((d) => [d.id, d.device_id]));
    const idByCode = new Map<string, string>((kpclDevices ?? []).map((d) => [d.device_id, d.id]));
    const currentOnlineByCode = new Map<string, boolean>(
      kpclStatus.map((d) => [d.device_id, d.is_online])
    );

    const readingHoursByCode = new Map<string, Set<number>>();
    const readingBytesByCodeHour = new Map<string, Map<number, number>>();
    const encoder = new TextEncoder();
    for (const row of recentReadings ?? []) {
      if (!row.recorded_at) continue;
      const ts = Date.parse(row.recorded_at);
      if (!Number.isFinite(ts) || ts < windowStart || ts >= windowEnd) continue;
      const code = codeById.get(row.device_id);
      if (!code) continue;
      const hourKey = Math.floor(ts / hourMs) * hourMs;
      if (!readingHoursByCode.has(code)) readingHoursByCode.set(code, new Set<number>());
      readingHoursByCode.get(code)!.add(hourKey);
      if (!readingBytesByCodeHour.has(code)) {
        readingBytesByCodeHour.set(code, new Map<number, number>());
      }
      const rowBytes = encoder.encode(JSON.stringify(row)).length;
      const byHour = readingBytesByCodeHour.get(code)!;
      byHour.set(hourKey, (byHour.get(hourKey) ?? 0) + rowBytes);
    }

    const transitionsByCode = new Map<string, Array<{ ts: number; toOnline: boolean }>>();
    for (const evt of deviceStateEvents ?? []) {
      const createdTs = Date.parse(evt.created_at);
      if (!Number.isFinite(createdTs)) continue;
      const payload = evt.payload as Record<string, unknown> | null;
      const code = typeof payload?.device_id === "string" ? payload.device_id : null;
      if (!code || !idByCode.has(code)) continue;
      if (!transitionsByCode.has(code)) transitionsByCode.set(code, []);
      transitionsByCode.get(code)!.push({
        ts: createdTs,
        toOnline: evt.event_type === "device_online_detected",
      });
    }

    return (kpclDevices ?? []).map((device) => {
      const code = device.device_id;
      const transitions = (transitionsByCode.get(code) ?? []).sort((a, b) => a.ts - b.ts);
      let state: boolean | null = null;
      let hasSignalInWindow = false;

      const points: Array<{ ts: number; online: boolean | null; payload_bytes: number }> = [];
      let cursor = 0;
      for (let i = 0; i < totalHours; i += 1) {
        const t = windowStart + i * hourMs;
        while (cursor < transitions.length && transitions[cursor].ts <= t) {
          state = transitions[cursor].toOnline;
          hasSignalInWindow = true;
          cursor += 1;
        }
        if (readingHoursByCode.get(code)?.has(t)) {
          state = true;
          hasSignalInWindow = true;
        }
        const payloadBytes = readingBytesByCodeHour.get(code)?.get(t) ?? 0;
        points.push({
          ts: t,
          online: hasSignalInWindow ? state : null,
          payload_bytes: payloadBytes,
        });
      }
      // If device is currently online but we do not yet have enough events/readings,
      // force the right edge to green so live status is visible in the admin chart.
      if (currentOnlineByCode.get(code) === true && points.length > 0) {
        const tailHours = Math.min(2, points.length);
        for (let i = points.length - tailHours; i < points.length; i += 1) {
          points[i] = { ...points[i], online: true };
        }
      }

      return {
        device_id: code,
        points,
      };
    });
  })();

  const currentBridgeStatus = (() => {
    const byBridge = new Map<string, any>();
    for (const row of bridges ?? []) {
      const key = row.device_id;
      if (!key) continue;
      const prev = byBridge.get(key);
      const rowTs = Date.parse(row.last_seen ?? "");
      const prevTs = Date.parse(prev?.last_seen ?? "");
      if (!prev || (!Number.isNaN(rowTs) && (Number.isNaN(prevTs) || rowTs > prevTs))) {
        byBridge.set(key, row);
      }
    }
    return Array.from(byBridge.values());
  })();

  const adminTableStats = (effectiveObjectStats as AdminObjectStat[]).sort((a, b) => {
    const sizeA = Number(a.size_bytes ?? 0);
    const sizeB = Number(b.size_bytes ?? 0);
    return sizeB - sizeA;
  });

  const supabaseStorage = (() => {
    const planMb = Number(
      process.env.SUPABASE_TOTAL_PLAN_MB ??
        process.env.SUPABASE_STORAGE_PLAN_MB ??
        1024
    );
    const planBytes = Number.isFinite(planMb) && planMb > 0 ? planMb * 1024 * 1024 : 1024 * 1024 * 1024;
    const storageBytes = safeStorageObjects.reduce((acc, row) => {
      const meta = row.metadata as Record<string, unknown> | null;
      const sizeRaw = meta?.size;
      const size =
        typeof sizeRaw === "number"
          ? sizeRaw
          : typeof sizeRaw === "string"
          ? Number(sizeRaw)
          : 0;
      return acc + (Number.isFinite(size) ? size : 0);
    }, 0);
    const dbBytes = adminTableStats
      .filter((row) => row.object_type === "table")
      .reduce((acc, row) => acc + Math.max(0, Number(row.size_bytes ?? 0)), 0);
    const usedBytes = storageBytes + dbBytes;
    const usedMb = usedBytes / (1024 * 1024);
    const usedPercent = planBytes > 0 ? Math.min(100, (usedBytes / planBytes) * 100) : 0;
    return {
      plan_mb: Number((planBytes / (1024 * 1024)).toFixed(2)),
      used_mb: Number(usedMb.toFixed(2)),
      used_percent: Number(usedPercent.toFixed(2)),
      db_used_mb: Number((dbBytes / (1024 * 1024)).toFixed(2)),
      storage_used_mb: Number((storageBytes / (1024 * 1024)).toFixed(2)),
      objects_count: safeStorageObjects.length,
    };
  })();

  const financeSummary = (() => {
    if (financeSummaryError || !financeSummaryRow) return null;
    const row = financeSummaryRow as FinanceSummaryRow;
    return {
      generated_at: row.generated_at,
      bom_unit_cost_usd: Number(row.bom_unit_cost_usd ?? 0),
      cloud_monthly_cost_usd: Number(row.cloud_monthly_cost_usd ?? 0),
      snapshot_month: row.snapshot_month,
      units_produced: Number(row.units_produced ?? 0),
      total_cost_usd: Number(row.total_cost_usd ?? 0),
      unit_cost_usd: Number(row.unit_cost_usd ?? 0),
    };
  })();

  const financePlans = financeProvidersError
    ? []
    : (financeProviders as FinanceProviderRow[] | null) ?? [];

  const financeBreakdown = (() => {
    if (financeMonthlySnapshotError || !financeMonthlySnapshotRow) return null;
    const row = financeMonthlySnapshotRow as FinanceMonthlySnapshotRow;
    return {
      snapshot_month: row.snapshot_month,
      units_produced: Number(row.units_produced ?? 0),
      bom_cost_total_usd: Number(row.bom_cost_total_usd ?? 0),
      manufacturing_cost_total_usd: Number(row.manufacturing_cost_total_usd ?? 0),
      cloud_cost_total_usd: Number(row.cloud_cost_total_usd ?? 0),
      logistics_cost_total_usd: Number(row.logistics_cost_total_usd ?? 0),
      support_cost_total_usd: Number(row.support_cost_total_usd ?? 0),
      warranty_cost_total_usd: Number(row.warranty_cost_total_usd ?? 0),
      total_cost_usd: Number(row.total_cost_usd ?? 0),
      unit_cost_usd: Number(row.unit_cost_usd ?? 0),
      updated_at: row.updated_at,
    };
  })();

  const financeBreakEven = (() => {
    const unitCost = financeBreakdown?.unit_cost_usd ?? financeSummary?.unit_cost_usd ?? 0;
    const fixedMonthly =
      (financeBreakdown?.cloud_cost_total_usd ?? 0) +
      (financeBreakdown?.logistics_cost_total_usd ?? 0) +
      (financeBreakdown?.support_cost_total_usd ?? 0) +
      (financeBreakdown?.warranty_cost_total_usd ?? 0);

    const platePriceUsd = Number(process.env.ADMIN_KIT_PRICE_USD ?? 0);
    const subscriptionPriceUsd = Number(process.env.ADMIN_SUBSCRIPTION_PRICE_USD ?? 0);
    const cacUsd = Number(process.env.ADMIN_CAC_USD ?? 0);
    const churnMonthly = Number(process.env.ADMIN_CHURN_MONTHLY ?? 0);

    const hasPlatePrice = Number.isFinite(platePriceUsd) && platePriceUsd > 0;
    const marginPerUnitUsd = hasPlatePrice ? platePriceUsd - unitCost : null;
    const breakEvenUnits =
      marginPerUnitUsd && marginPerUnitUsd > 0 && fixedMonthly > 0
        ? Number((fixedMonthly / marginPerUnitUsd).toFixed(2))
        : null;

    const ltvUsd =
      subscriptionPriceUsd > 0 && churnMonthly > 0
        ? Number((subscriptionPriceUsd * (1 / churnMonthly)).toFixed(2))
        : null;
    const ltvCacRatio =
      ltvUsd && cacUsd > 0 ? Number((ltvUsd / cacUsd).toFixed(2)) : null;

    return {
      plate_price_usd: hasPlatePrice ? platePriceUsd : null,
      subscription_price_usd:
        Number.isFinite(subscriptionPriceUsd) && subscriptionPriceUsd > 0
          ? subscriptionPriceUsd
          : null,
      cac_usd: Number.isFinite(cacUsd) && cacUsd > 0 ? cacUsd : null,
      churn_monthly:
        Number.isFinite(churnMonthly) && churnMonthly > 0 ? churnMonthly : null,
      margin_per_unit_usd: marginPerUnitUsd,
      fixed_monthly_usd: Number(fixedMonthly.toFixed(2)),
      break_even_units: breakEvenUnits,
      ltv_usd: ltvUsd,
      ltv_cac_ratio: ltvCacRatio,
      source:
        hasPlatePrice && subscriptionPriceUsd > 0 && cacUsd > 0 && churnMonthly > 0
          ? "env_config"
          : "partial_config",
    };
  })();

  const kpclCatalog = (() => {
    if (kpclCatalogProfilesError || kpclCatalogComponentsError) {
      return DEFAULT_KPCL_COST_CATALOG;
    }
    const profiles = (kpclCatalogProfiles as KpclCatalogProfileRow[] | null) ?? [];
    const components = (kpclCatalogComponents as KpclCatalogComponentRow[] | null) ?? [];
    if (!profiles.length) return DEFAULT_KPCL_COST_CATALOG;

    const componentsByProfile = new Map<string, KpclCatalog["components"]>();
    for (const row of components) {
      if (!componentsByProfile.has(row.profile_key)) {
        componentsByProfile.set(row.profile_key, []);
      }
      componentsByProfile.get(row.profile_key)!.push({
        code: row.component_code,
        name: row.component_name,
        qty: Number(row.qty ?? 0),
        unit_cost_usd: Number(row.unit_cost_usd ?? 0),
        notes: row.notes ?? undefined,
      });
    }

    const catalog: Record<string, KpclCatalog> = {};
    for (const row of profiles) {
      catalog[row.profile_key] = {
        key: row.profile_key,
        label: row.label,
        print_grams: Number(row.print_grams ?? 0),
        print_hours: Number(row.print_hours ?? 0),
        print_unit_cost_usd: Number(row.print_unit_cost_usd ?? 0),
        maintenance_monthly_usd: Number(row.maintenance_monthly_usd ?? 0),
        power_monthly_usd: Number(row.power_monthly_usd ?? 0),
        components:
          componentsByProfile.get(row.profile_key) ??
          DEFAULT_KPCL_COST_CATALOG["generic-kpcl"].components,
      };
    }

    if (!catalog["generic-kpcl"]) {
      catalog["generic-kpcl"] = DEFAULT_KPCL_COST_CATALOG["generic-kpcl"];
    }
    return catalog;
  })();

  let vercelUsage: VercelUsageSummary | null = null;
  try {
    vercelUsage = await fetchVercelUsageSummary();
  } catch (error) {
    console.warn("[admin_overview] vercel_usage_unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  logRequestEnd(req, startedAt, 200, {
    admin_role: adminRole.role,
    audit_count: dedupedAuditEvents?.length ?? 0,
    bridge_count: currentBridgeStatus.length,
    offline_device_count: offlineDevices?.length ?? 0,
    registration_pending: registrationSummary.pending_total,
  });

  const payload = {
    admin_role: adminRole.role,
    summary: summary ?? null,
    audit_events: dedupedAuditEvents ?? [],
    bridges: currentBridgeStatus,
    offline_devices: offlineDevices ?? [],
    kpcl_devices: kpclStatus,
    kpcl_device_hourly_status: kpclDeviceHourlyStatus,
    kpcl_totals_origin: kpclTotalsOrigin,
    incident_counters: incidentCounters,
    active_general_outage: activeGeneralOutage,
    registration_summary: registrationSummary,
    supabase_storage: supabaseStorage,
    vercel_usage: vercelUsage,
    finance_summary: financeSummary,
    finance_breakdown: financeBreakdown,
    finance_break_even: financeBreakEven,
    finance_plans: financePlans,
    kpcl_catalog: kpclCatalog,
    db_object_stats: adminTableStats,
    stale_cutoff: staleCutoff,
  };

  if (!noCache && cacheTtlSec > 0) {
    await setCacheJson(cacheKey, payload, cacheTtlSec);
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: { "x-admin-cache": noCache ? "BYPASS" : "MISS" },
  });
}
