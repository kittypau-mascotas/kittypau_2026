import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  apiError,
  getUserClient,
  isAdminFallbackEmail,
  logRequestEnd,
  startRequestTimer,
} from "../../_utils";
import {
  getAdminPermissions,
  normalizeAdminRole,
  type AdminRole,
} from "../_permissions";

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
  const resolvedRole: AdminRole | null =
    normalizeAdminRole(data?.role) ?? (fallbackAdmin ? "owner_admin" : null);
  const isAdmin = Boolean(resolvedRole);
  const permissions = resolvedRole ? getAdminPermissions(resolvedRole) : null;
  logRequestEnd(req, startedAt, 200, { is_admin: isAdmin, role: resolvedRole });
  return NextResponse.json(
    {
      ok: true,
      is_admin: isAdmin,
      role: resolvedRole,
      permissions,
    },
    { status: 200 },
  );
}
