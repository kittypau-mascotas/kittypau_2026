import { NextRequest, NextResponse } from "next/server";
import {
  analyticsAvailable,
  supabaseAnalytics,
} from "@/lib/supabase/analytics";
import { supabaseServer } from "@/lib/supabase/server";
import {
  apiError,
  getUserClient,
  startRequestTimer,
  logRequestEnd,
} from "../../_utils";

// GET /api/analytics/daily?pet_id=X&days=30
// Devuelve resúmenes diarios para gráficos de tendencia semanal/mensual

const FREE_HISTORY_DAYS = 3;
const PREMIUM_HISTORY_DAYS = 365;

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;
  const { searchParams } = new URL(req.url);

  const petId = searchParams.get("pet_id");
  const daysRaw = searchParams.get("days");
  const days = daysRaw ? Math.min(Number(daysRaw), 365) : 30;

  if (!petId) {
    return apiError(req, 400, "MISSING_PET_ID", "pet_id is required");
  }

  // Cutoff máximo (premium) para lanzar data query en paralelo con profile.
  const maxCutoff = new Date(
    Date.now() - PREMIUM_HISTORY_DAYS * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const buildDataQuery = () => {
    if (!analyticsAvailable || !supabaseAnalytics) return null;
    return supabaseAnalytics
      .from("pet_daily_summary")
      .select(
        "summary_date,total_food_grams,food_sessions,total_water_ml,water_sessions," +
          "anomaly_count,skipped_meals,avg_temperature,avg_humidity," +
          "first_session_at,last_session_at",
      )
      .eq("owner_id", user.id)
      .eq("pet_id", petId)
      .gte("summary_date", maxCutoff)
      .order("summary_date", { ascending: true });
  };

  const dataQuery = buildDataQuery();

  // Profile y datos corren en paralelo
  const [profileResult, dataResult] = await Promise.all([
    supabaseServer.from("profiles").select("plan").eq("id", user.id).single(),
    dataQuery ?? Promise.resolve({ data: null, error: null }),
  ]);

  const isPremium = profileResult.data?.plan === "premium";
  const maxDays = isPremium ? PREMIUM_HISTORY_DAYS : FREE_HISTORY_DAYS;
  const effectiveDays = Math.min(days, maxDays);
  const cutoff = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (!analyticsAvailable || !supabaseAnalytics) {
    logRequestEnd(req, startedAt, 200, { count: 0, analytics: "unavailable" });
    return NextResponse.json(
      {
        data: [],
        meta: {
          is_premium: isPremium,
          history_days: effectiveDays,
          analytics_available: false,
        },
      },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } },
    );
  }

  if (dataResult.error) {
    return apiError(req, 500, "ANALYTICS_ERROR", dataResult.error.message);
  }

  // Aplicar cutoff real en memoria
  const allRows = (dataResult.data ?? []) as Array<{ summary_date?: string | null }>;
  const rows = allRows.filter((r) => !r.summary_date || r.summary_date >= cutoff);

  logRequestEnd(req, startedAt, 200, { count: rows.length });

  return NextResponse.json(
    {
      data: rows,
      meta: {
        is_premium: isPremium,
        history_days: effectiveDays,
        analytics_available: true,
      },
    },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } },
  );
}
