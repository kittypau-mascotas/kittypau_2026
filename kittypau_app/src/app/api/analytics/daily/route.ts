import { NextRequest, NextResponse } from "next/server";
import { supabaseAnalytics } from "@/lib/supabase/analytics";
import { apiError, getUserClient, startRequestTimer, logRequestEnd } from "../../_utils";

// GET /api/analytics/daily?pet_id=X&days=30
// Devuelve resúmenes diarios para gráficos de tendencia semanal/mensual

const FREE_HISTORY_DAYS    = 7;
const PREMIUM_HISTORY_DAYS = 365;

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;
  const { searchParams } = new URL(req.url);

  const petId   = searchParams.get("pet_id");
  const daysRaw = searchParams.get("days");
  const days    = daysRaw ? Math.min(Number(daysRaw), 365) : 30;

  if (!petId) {
    return apiError(req, 400, "MISSING_PET_ID", "pet_id is required");
  }

  // TODO: reemplazar con lookup real de plan del usuario
  const isPremium = false;
  const maxDays   = isPremium ? PREMIUM_HISTORY_DAYS : FREE_HISTORY_DAYS;
  const effectiveDays = Math.min(days, maxDays);
  const cutoff = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabaseAnalytics
    .from("pet_daily_summary")
    .select(
      "summary_date,total_food_grams,food_sessions,total_water_ml,water_sessions," +
      "anomaly_count,skipped_meals,avg_temperature,avg_humidity," +
      "first_session_at,last_session_at"
    )
    .eq("owner_id", user.id)
    .eq("pet_id", petId)
    .gte("summary_date", cutoff)
    .order("summary_date", { ascending: true });

  if (error) {
    return apiError(req, 500, "ANALYTICS_ERROR", error.message);
  }

  logRequestEnd(req, startedAt, 200, { count: (data ?? []).length });

  return NextResponse.json({
    data: data ?? [],
    meta: {
      is_premium: isPremium,
      history_days: effectiveDays,
    },
  });
}
