import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, getUserClient } from "@/app/api/_utils";
import {
  DEFAULT_KPCL_COST_CATALOG,
  type KpclCatalog,
} from "@/lib/finance/kpcl-catalog";

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
};

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
  if (!adminRole) {
    return apiError(req, 403, "FORBIDDEN", "Admin role required");
  }

  const [{ data: profiles, error: profilesError }, { data: components, error: componentsError }] =
    await Promise.all([
      supabaseServer
        .from("finance_kpcl_profiles")
        .select(
          "profile_key, label, print_grams, print_hours, print_unit_cost_usd, maintenance_monthly_usd, power_monthly_usd"
        )
        .eq("active", true)
        .order("profile_key", { ascending: true }),
      supabaseServer
        .from("finance_kpcl_profile_components")
        .select("profile_key, component_code, component_name, qty, unit_cost_usd, notes")
        .order("profile_key", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);

  if (profilesError) {
    return apiError(req, 500, "SUPABASE_ERROR", profilesError.message);
  }
  if (componentsError) {
    return apiError(req, 500, "SUPABASE_ERROR", componentsError.message);
  }

  const profileRows = (profiles as KpclCatalogProfileRow[] | null) ?? [];
  const componentRows = (components as KpclCatalogComponentRow[] | null) ?? [];
  if (!profileRows.length) {
    return NextResponse.json({ kpcl_catalog: DEFAULT_KPCL_COST_CATALOG });
  }

  const componentsByProfile = new Map<string, KpclCatalog["components"]>();
  for (const row of componentRows) {
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

  const kpclCatalog: Record<string, KpclCatalog> = {};
  for (const row of profileRows) {
    kpclCatalog[row.profile_key] = {
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

  return NextResponse.json({ kpcl_catalog: kpclCatalog });
}
