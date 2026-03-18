import { NextRequest, NextResponse } from "next/server";
import { supabaseAnalytics } from "@/lib/supabase/analytics";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError, getUserClient, startRequestTimer, logRequestEnd } from "../../_utils";

// GET /api/analytics/sessions?pet_id=X&from=ISO&to=ISO&limit=50&cursor=ISO
// Clientes free: máximo 3 días de historial
// Clientes premium: hasta 1 año

const FREE_HISTORY_DAYS    = 3;
const PREMIUM_HISTORY_DAYS = 365;

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;
  const { searchParams } = new URL(req.url);

  const petId     = searchParams.get("pet_id");
  const from      = searchParams.get("from");
  const to        = searchParams.get("to");
  const cursor    = searchParams.get("cursor");
  const limitRaw  = searchParams.get("limit");
  const limit     = limitRaw ? Math.min(Number(limitRaw), 200) : 50;

  if (!petId) {
    return apiError(req, 400, "MISSING_PET_ID", "pet_id is required");
  }

  // Determinar ventana de historial permitida según plan del usuario
  const supabase = supabaseServer;
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const isPremium = profile?.plan === "premium";
  const maxDays   = isPremium ? PREMIUM_HISTORY_DAYS : FREE_HISTORY_DAYS;
  const cutoff    = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString();

  const effectiveFrom = from && from > cutoff ? from : cutoff;

  let query = supabaseAnalytics
    .from("pet_sessions")
    .select(
      "id,device_id,session_type,session_start,session_end,duration_sec," +
      "grams_consumed,water_ml,classification,anomaly_score,baseline_grams," +
      "avg_temperature,avg_humidity"
    )
    .eq("owner_id", user.id)
    .eq("pet_id", petId)
    .gte("session_start", effectiveFrom)
    .order("session_start", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("session_start", cursor);
  }
  if (to) {
    query = query.lte("session_start", to);
  }

  const { data, error } = await query;

  if (error) {
    return apiError(req, 500, "ANALYTICS_ERROR", error.message);
  }

  const rows = (data ?? []) as Array<{ session_start?: string | null }>;
  const nextCursor = rows.length > 0 ? (rows[rows.length - 1]?.session_start ?? null) : null;

  logRequestEnd(req, startedAt, 200, { count: rows.length });

  return NextResponse.json({
    data: rows,
    next_cursor: nextCursor,
    meta: {
      is_premium: isPremium,
      history_days: maxDays,
      cutoff: cutoff,
    },
  });
}
