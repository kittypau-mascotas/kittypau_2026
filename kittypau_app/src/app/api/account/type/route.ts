import { NextRequest, NextResponse } from "next/server";
import { getUserClient, apiError } from "../../_utils";
import { supabaseServer } from "@/lib/supabase/server";

type AccountType = "admin" | "tester" | "client";

function isTesterEmail(email: string | null): boolean {
  if (!email) return false;
  const defaultEmails = ["kittypau.mascotas@gmail.com"];
  const envEmails = (process.env.TESTER_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const allowed = new Set([...defaultEmails, ...envEmails]);
  return allowed.has(email.toLowerCase());
}

export async function GET(req: NextRequest) {
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

  const isAdmin = Boolean(adminRole);
  const isTester = isTesterEmail(user.email ?? null);

  const accountType: AccountType = isAdmin
    ? "admin"
    : isTester
    ? "tester"
    : "client";

  return NextResponse.json(
    {
      account_type: accountType,
      is_special: accountType !== "client",
      is_admin: isAdmin,
      is_tester: isTester,
      admin_role: adminRole?.role ?? null,
    },
    { status: 200 }
  );
}

