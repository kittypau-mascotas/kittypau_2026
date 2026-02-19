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
  const { data, error } = await supabaseServer
    .from("admin_roles")
    .select("role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const isAdmin = Boolean(data);
  logRequestEnd(req, startedAt, 200, { is_admin: isAdmin, role: data?.role ?? null });
  return NextResponse.json(
    {
      ok: true,
      is_admin: isAdmin,
      role: data?.role ?? null,
    },
    { status: 200 }
  );
}

