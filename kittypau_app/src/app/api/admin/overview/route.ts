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

  const [{ data: summary, error: summaryError }, { data: auditEvents, error: auditError }] =
    await Promise.all([
      supabaseServer.from("admin_dashboard_live").select("*").limit(1).maybeSingle(),
      supabaseServer
        .from("audit_events")
        .select("id, event_type, actor_id, entity_type, entity_id, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(auditLimit),
    ]);

  if (summaryError) {
    return apiError(req, 500, "SUPABASE_ERROR", summaryError.message);
  }
  if (auditError) {
    return apiError(req, 500, "SUPABASE_ERROR", auditError.message);
  }

  logRequestEnd(req, startedAt, 200, {
    admin_role: adminRole.role,
    audit_count: auditEvents?.length ?? 0,
  });

  return NextResponse.json({
    admin_role: adminRole.role,
    summary: summary ?? null,
    audit_events: auditEvents ?? [],
  });
}
