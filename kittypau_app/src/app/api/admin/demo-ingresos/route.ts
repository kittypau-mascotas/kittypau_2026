import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  apiError,
  getUserClient,
  isAdminFallbackEmail,
  logRequestEnd,
  startRequestTimer,
} from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);

  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;

  const { data: role, error: roleError } = await supabaseServer
    .from("admin_roles")
    .select("role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (roleError) {
    return apiError(req, 500, "SUPABASE_ERROR", roleError.message);
  }

  if (!role && !isAdminFallbackEmail(user.email ?? null)) {
    logRequestEnd(req, startedAt, 403);
    return apiError(req, 403, "FORBIDDEN", "Admin access required");
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(500, Math.max(1, Math.trunc(limitRaw)))
    : 200;

  const { data, error } = await supabaseServer
    .from("demo_ingresos")
    .select(
      "id,email,owner_name,pet_name,source,first_seen_at,last_seen_at,count",
    )
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (error) {
    logRequestEnd(req, startedAt, 500);
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  logRequestEnd(req, startedAt, 200, { count: data?.length ?? 0 });
  return NextResponse.json({ ok: true, items: data ?? [] }, { status: 200 });
}
