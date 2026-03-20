import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  apiError,
  getUserClient,
  isAdminFallbackEmail,
} from "@/app/api/_utils";
import { handleReadingsGet } from "@/app/api/readings/route";
import {
  getAdminPermissions,
  normalizeAdminRole,
  type AdminRole,
} from "../../_permissions";

type AdminTestResult = {
  id: string;
  name: string;
  status: "pass" | "fail";
  duration_ms: number;
  details: string;
};

async function ensureAdmin(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) return { error: auth.error, status: 401 as const };

  const { user } = auth;
  const { data: role, error } = await supabaseServer
    .from("admin_roles")
    .select("role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 as const };
  const fallbackAdmin = isAdminFallbackEmail(user.email ?? null);
  const resolvedAdminRole: AdminRole | null =
    normalizeAdminRole(role?.role) ?? (fallbackAdmin ? "owner_admin" : null);
  if (!resolvedAdminRole) {
    return { error: "Admin role required", status: 403 as const };
  }
  return {
    userId: user.id,
    role: resolvedAdminRole,
    permissions: getAdminPermissions(resolvedAdminRole),
  };
}

async function runTest(
  id: string,
  name: string,
  testFn: () => Promise<string>,
): Promise<AdminTestResult> {
  const started = Date.now();
  try {
    const details = await testFn();
    return {
      id,
      name,
      status: "pass",
      duration_ms: Date.now() - started,
      details,
    };
  } catch (error) {
    return {
      id,
      name,
      status: "fail",
      duration_ms: Date.now() - started,
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(req: NextRequest) {
  const admin = await ensureAdmin(req);
  if ("error" in admin) {
    return apiError(
      req,
      admin.status ?? 401,
      "AUTH_INVALID",
      admin.error ?? "Unauthorized",
    );
  }
  if (!admin.permissions.can_run_test_suite) {
    return apiError(req, 403, "FORBIDDEN", "Test suite not allowed");
  }

  const results: AdminTestResult[] = [];

  results.push(
    await runTest(
      "admin_dashboard_live",
      "Vista admin_dashboard_live",
      async () => {
        const { error } = await supabaseServer
          .from("admin_dashboard_live")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return "Vista operativa";
      },
    ),
  );

  results.push(
    await runTest(
      "bridge_status_live",
      "Vista bridge_status_live",
      async () => {
        const { data, error } = await supabaseServer
          .from("bridge_status_live")
          .select("device_id, bridge_status, last_seen")
          .limit(5);
        if (error) throw new Error(error.message);
        return `${data?.length ?? 0} bridge(s) consultados`;
      },
    ),
  );

  results.push(
    await runTest("kpcl_devices", "Inventario KPCL", async () => {
      const { data, error } = await supabaseServer
        .from("devices")
        .select("id")
        .ilike("device_id", "KPCL%")
        .is("retired_at", null);
      if (error) throw new Error(error.message);
      return `${data?.length ?? 0} KPCL activos detectados`;
    }),
  );

  results.push(
    await runTest("finance_summary", "Resumen financiero", async () => {
      if (!admin.permissions.can_view_finance) {
        return "Skipped (no finance permission)";
      }
      const { data, error } = await supabaseServer
        .from("finance_admin_summary")
        .select("generated_at, bom_unit_cost_usd, cloud_monthly_cost_usd")
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Sin datos en finance_admin_summary");
      return "Resumen financiero disponible";
    }),
  );

  results.push(
    await runTest("kpcl_catalog", "Catálogo KPCL financiero", async () => {
      if (!admin.permissions.can_view_finance) {
        return "Skipped (no finance permission)";
      }
      const { data: profiles, error: pErr } = await supabaseServer
        .from("finance_kpcl_profiles")
        .select("profile_key")
        .eq("active", true);
      if (pErr) throw new Error(pErr.message);
      const { data: comps, error: cErr } = await supabaseServer
        .from("finance_kpcl_profile_components")
        .select("id")
        .limit(1);
      if (cErr) throw new Error(cErr.message);
      return `${profiles?.length ?? 0} perfil(es), ${comps?.length ?? 0}+ componente(s)`;
    }),
  );

  results.push(
    await runTest("db_object_stats", "Catálogo de tablas/vistas", async () => {
      const { data, error } = await supabaseServer
        .from("admin_object_stats_live")
        .select("object_name, object_type")
        .limit(10);
      if (!error) {
        return `${data?.length ?? 0} objetos por vista`;
      }
      const { data: fallback, error: fallbackErr } =
        await supabaseServer.rpc("admin_object_stats");
      if (fallbackErr) throw new Error(fallbackErr.message);
      return `${(fallback as Array<unknown> | null)?.length ?? 0} objetos por RPC fallback`;
    }),
  );

  results.push(
    await runTest(
      "api_readings_contract",
      "Contrato /api/readings",
      async () => {
        const { data: devices, error: devErr } = await supabaseServer
          .from("devices")
          .select("id, owner_id")
          .not("owner_id", "is", null)
          .is("retired_at", null)
          .limit(1);
        if (devErr) throw new Error(devErr.message);
        const device = devices?.[0] as
          | { id?: string; owner_id?: string }
          | undefined;
        if (!device?.id || !device.owner_id) {
          throw new Error(
            "No hay device con owner_id para probar /api/readings",
          );
        }

        const baseUrl = new URL("http://local.test/api/readings");
        baseUrl.searchParams.set("device_id", device.id);

        const resArray = await handleReadingsGet(
          new NextRequest(baseUrl),
          Date.now(),
          { supabase: supabaseServer, userId: device.owner_id },
        );
        if (!resArray.ok) {
          const err = (await resArray.json()) as Record<string, unknown>;
          throw new Error(
            `Esperaba 200, obtuve ${resArray.status}: ${String(
              err.code ?? err.error ?? "error",
            )}`,
          );
        }
        const arr = (await resArray.json()) as unknown;
        if (!Array.isArray(arr))
          throw new Error("Respuesta no paginada no es array");

        const pagedUrl = new URL(baseUrl);
        pagedUrl.searchParams.set("limit", "2");
        const resPaged = await handleReadingsGet(
          new NextRequest(pagedUrl),
          Date.now(),
          { supabase: supabaseServer, userId: device.owner_id },
        );
        if (!resPaged.ok)
          throw new Error(`Paginado esperaba 200, obtuve ${resPaged.status}`);
        const paged = (await resPaged.json()) as Record<string, unknown>;
        if (!Array.isArray(paged.data)) throw new Error("Paginado sin data[]");
        if (!("next_cursor" in paged))
          throw new Error("Paginado sin next_cursor");

        const firstRow = (paged.data as Array<Record<string, unknown>>)[0];
        if (firstRow) {
          for (const key of [
            "id",
            "device_id",
            "recorded_at",
            "battery_level",
          ]) {
            if (!(key in firstRow))
              throw new Error(`Falta campo ${key} en lectura`);
          }
        }

        const badLimitUrl = new URL(baseUrl);
        badLimitUrl.searchParams.set("limit", "0");
        const resBadLimit = await handleReadingsGet(
          new NextRequest(badLimitUrl),
          Date.now(),
          { supabase: supabaseServer, userId: device.owner_id },
        );
        if (resBadLimit.status !== 400) {
          throw new Error(
            `INVALID_LIMIT esperaba 400, obtuve ${resBadLimit.status}`,
          );
        }
        const badLimit = (await resBadLimit.json()) as Record<string, unknown>;
        if (badLimit.code !== "INVALID_LIMIT") {
          throw new Error(
            `Esperaba code INVALID_LIMIT, obtuve ${String(badLimit.code)}`,
          );
        }

        const otherUserId = crypto.randomUUID();
        const resForbidden = await handleReadingsGet(
          new NextRequest(baseUrl),
          Date.now(),
          { supabase: supabaseServer, userId: otherUserId },
        );
        if (resForbidden.status !== 403) {
          throw new Error(
            `FORBIDDEN esperaba 403, obtuve ${resForbidden.status}`,
          );
        }

        return `OK (device_id=${device.id}, paged=${(paged.data as Array<unknown>).length})`;
      },
    ),
  );

  const failed = results.filter((r) => r.status === "fail");
  const status = failed.length ? "failed" : "passed";

  if (failed.length > 0) {
    await supabaseServer.from("audit_events").insert({
      event_type: "admin_test_suite_failed",
      actor_id: admin.userId,
      entity_type: "admin_tests",
      entity_id: "run_all",
      payload: {
        status,
        failed_count: failed.length,
        total_count: results.length,
        results,
        generated_at: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({
    status,
    failed_count: failed.length,
    total_count: results.length,
    results,
    generated_at: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  const admin = await ensureAdmin(req);
  if ("error" in admin) {
    return apiError(
      req,
      admin.status ?? 401,
      "AUTH_INVALID",
      admin.error ?? "Unauthorized",
    );
  }

  const { data, error } = await supabaseServer
    .from("audit_events")
    .select("id, event_type, created_at, payload")
    .eq("event_type", "admin_test_suite_failed")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const history = (data ?? []).map((row) => {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      event_type: row.event_type,
      created_at: row.created_at,
      status: payload.status ?? null,
      failed_count: payload.failed_count ?? null,
      total_count: payload.total_count ?? null,
      results: payload.results ?? [],
    };
  });

  return NextResponse.json({ history });
}
