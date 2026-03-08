import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  apiError,
  getUserClient,
  isAdminFallbackEmail,
  logRequestEnd,
  startRequestTimer,
} from "../../_utils";

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);

  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;
  const { data, error } = await supabaseServer
    .from("admin_roles")
    .select("role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const fallbackAdmin = isAdminFallbackEmail(user.email ?? null);
  const isAdmin = Boolean(data) || fallbackAdmin;
  const resolvedRole = data?.role ?? (fallbackAdmin ? "owner_admin" : null);
  logRequestEnd(req, startedAt, 200, { is_admin: isAdmin, role: resolvedRole });
  return NextResponse.json(
    {
      ok: true,
      is_admin: isAdmin,
      role: resolvedRole,
    },
    { status: 200 }
  );
}
