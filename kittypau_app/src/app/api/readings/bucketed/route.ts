import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../_utils";
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
  const bucketS = Math.max(
    60,
    Math.min(86400, Number(searchParams.get("bucket_s") ?? "300")),
  );

  if (!deviceId)
    return apiError(req, 400, "MISSING_DEVICE_ID", "device_id is required");
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

  if (deviceError || !device)
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  if (device.owner_id !== user.id)
    return apiError(req, 403, "FORBIDDEN", "Forbidden");

  // Obtener todas las lecturas, paginando por tamaño de página REAL devuelto.
  // ponytail: Supabase/PostgREST cappea cada request a un máximo del lado del
  // servidor (medido: 1000 filas, `db-max-rows`) sin importar qué .range() se
  // pida — pedir range(0,4999) no trae 5000, trae 1000 igual (Content-Range:
  // 0-999/N). Asumir "si total <= PAGE_SIZE entonces 1 página alcanza" es el
  // bug real (encontrado 2026-08-11 en /api/pets/[id]/hunger-bar, mismo
  // patrón copiado de acá) — se perdían silenciosamente filas cada vez que
  // el total caía entre 1000 y PAGE_SIZE.
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 150; // ~150k filas tope de seguridad, igual que antes

  const allRows: {
    recorded_at: string | null;
    weight_grams: number | null;
    temperature: number | null;
    humidity: number | null;
    light_percent: number | null;
  }[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const start = page * PAGE_SIZE;
    const { data, error } = await supabaseServer
      .from("readings")
      .select("recorded_at,weight_grams,temperature,humidity,light_percent")
      .eq("device_id", deviceId)
      .gte("recorded_at", fromParam)
      .order("recorded_at", { ascending: false })
      .range(start, start + PAGE_SIZE - 1);
    if (error) return apiError(req, 500, "SUPABASE_ERROR", error.message);
    if (data) allRows.push(...data);
    if (!data || data.length < PAGE_SIZE) break; // página incompleta = no hay más
  }

  // Agregar por bucket
  type Row = {
    recorded_at: string | null;
    weight_grams: number | null;
    temperature: number | null;
    humidity: number | null;
    light_percent: number | null;
  };

  const buckets = new Map<
    number,
    { wg: number[]; t: number[]; h: number[]; lp: number[] }
  >();
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

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

  const result = Array.from(buckets.entries())
    .sort(([a], [b]) => b - a) // desc (newest first)
    .map(([ts, b]) => ({
      recorded_at: new Date(ts).toISOString(),
      weight_grams: avg(b.wg),
      temperature: avg(b.t),
      humidity: avg(b.h),
      light_percent: avg(b.lp),
    }));

  logRequestEnd(req, startedAt, 200, {
    device_id: deviceId,
    rows_in: allRows.length,
    buckets: result.length,
  });
  return NextResponse.json({ data: result, rows_processed: allRows.length });
}
