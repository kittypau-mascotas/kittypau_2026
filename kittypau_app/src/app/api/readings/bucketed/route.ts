import { NextRequest, NextResponse } from "next/server";
import { apiError, getUserClient, logRequestEnd, startRequestTimer } from "../../_utils";
import { supabaseServer } from "@/lib/supabase/server";

// No edge runtime — necesita múltiples queries paginadas server-side
// GET /api/readings/bucketed?device_id=UUID&from=ISO&bucket_s=300
// Devuelve lecturas agregadas (promedio por bucket) sin límite de 5000 rows.
export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("device_id");
  const fromParam = searchParams.get("from");
  const bucketS = Math.max(60, Math.min(86400, Number(searchParams.get("bucket_s") ?? "300")));

  if (!deviceId) return apiError(req, 400, "MISSING_DEVICE_ID", "device_id is required");
  if (!fromParam) return apiError(req, 400, "MISSING_FROM", "from is required");

  const fromDate = new Date(fromParam);
  if (Number.isNaN(fromDate.getTime())) {
    return apiError(req, 400, "INVALID_FROM", "from must be a valid ISO date");
  }

  // Verificar ownership
  const { data: device, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id, owner_id")
    .eq("id", deviceId)
    .single();

  if (deviceError || !device) return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  if (device.owner_id !== user.id) return apiError(req, 403, "FORBIDDEN", "Forbidden");

  // Obtener todas las lecturas paginando en paralelo
  const PAGE_SIZE = 5000;

  // Primera página para saber cuántas hay
  const { data: firstPage, error: firstError, count } = await supabaseServer
    .from("readings")
    .select("recorded_at,weight_grams,temperature,humidity,light_percent", { count: "exact" })
    .eq("device_id", deviceId)
    .gte("recorded_at", fromParam)
    .order("recorded_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (firstError) return apiError(req, 500, "SUPABASE_ERROR", firstError.message);

  const totalRows = count ?? 0;
  const allRows = [...(firstPage ?? [])];

  // Páginas adicionales en paralelo si hay más datos
  if (totalRows > PAGE_SIZE) {
    const pageCount = Math.min(Math.ceil(totalRows / PAGE_SIZE), 30); // max 30 páginas = 150k rows
    const extra = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, i) => {
        const start = (i + 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        return supabaseServer
          .from("readings")
          .select("recorded_at,weight_grams,temperature,humidity,light_percent")
          .eq("device_id", deviceId)
          .gte("recorded_at", fromParam)
          .order("recorded_at", { ascending: false })
          .range(start, end);
      }),
    );
    for (const { data } of extra) {
      if (data) allRows.push(...data);
    }
  }

  // Agregar por bucket
  type Row = {
    recorded_at: string | null;
    weight_grams: number | null;
    temperature: number | null;
    humidity: number | null;
    light_percent: number | null;
  };

  const buckets = new Map<number, { wg: number[]; t: number[]; h: number[]; lp: number[] }>();
  const bucketMs = bucketS * 1000;

  for (const row of allRows as Row[]) {
    if (!row.recorded_at) continue;
    const ts = new Date(row.recorded_at).getTime();
    if (Number.isNaN(ts)) continue;
    const key = Math.floor(ts / bucketMs) * bucketMs;
    if (!buckets.has(key)) buckets.set(key, { wg: [], t: [], h: [], lp: [] });
    const b = buckets.get(key)!;
    if (row.weight_grams !== null) b.wg.push(row.weight_grams);
    if (row.temperature !== null) b.t.push(row.temperature);
    if (row.humidity !== null) b.h.push(row.humidity);
    if (row.light_percent !== null) b.lp.push(row.light_percent);
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

  const result = Array.from(buckets.entries())
    .sort(([a], [b]) => b - a) // desc (newest first)
    .map(([ts, b]) => ({
      recorded_at: new Date(ts).toISOString(),
      weight_grams: avg(b.wg),
      temperature: avg(b.t),
      humidity: avg(b.h),
      light_percent: avg(b.lp),
    }));

  logRequestEnd(req, startedAt, 200, { device_id: deviceId, rows_in: allRows.length, buckets: result.length });
  return NextResponse.json({ data: result, rows_processed: allRows.length });
}
