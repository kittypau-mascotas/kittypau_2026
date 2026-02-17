import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, getUserClient, logRequestEnd, startRequestTimer } from "../../_utils";
import { logAudit } from "../../_audit";

export async function POST(req: NextRequest) {
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

  const token = process.env.BRIDGE_HEARTBEAT_SECRET;
  if (!token) {
    return apiError(req, 500, "MISCONFIGURED", "Missing BRIDGE_HEARTBEAT_SECRET");
  }

  const staleMin = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("stale_min") ?? 10), 1),
    60
  );
  const deviceStaleMin = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("device_stale_min") ?? 10), 1),
    1440
  );

  const res = await fetch(
    `${req.nextUrl.origin}/api/bridge/health-check?stale_min=${staleMin}&device_stale_min=${deviceStaleMin}&source=admin_manual`,
    {
      method: "GET",
      headers: { "x-bridge-token": token },
      cache: "no-store",
    }
  );

  const bodyText = await res.text();
  let payload: unknown = null;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    payload = bodyText;
  }

  await logAudit({
    event_type: "admin_health_check_run",
    actor_id: user.id,
    entity_type: "system",
    payload: {
      source: "admin",
      stale_min: staleMin,
      device_stale_min: deviceStaleMin,
      ok: res.ok,
      status: res.status,
    },
  });

  logRequestEnd(req, startedAt, 200, { ok: res.ok, status: res.status });
  return NextResponse.json(
    {
      ok: res.ok,
      status: res.status,
      result: payload,
    },
    { status: res.ok ? 200 : 502 }
  );
}
