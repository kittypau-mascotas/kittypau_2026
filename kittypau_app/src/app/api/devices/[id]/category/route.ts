import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { checkRateLimit, getRateKeyFromRequest } from "../../../_rate-limit";
import { logAudit } from "../../../_audit";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "edge";

const CATEGORY_LABELS = {
  kpcl_sin_plato: "KPCL SIN PLATO",
  kpcl_con_plato: "KPCL CON PLATO",
  tare_con_plato: "TARE CON PLATO",
  inicio_servido: "INICIO SERVIDO",
  termino_servido: "TERMINO SERVIDO",
  inicio_alimentacion: "INICIO ALIMENTACION",
  termino_alimentacion: "TERMINO ALIMENTACION",
  inicio_hidratacion: "INICIO HIDRATACION",
  termino_hidratacion: "TERMINO HIDRATACION",
} as const;

type CategoryKey = keyof typeof CATEGORY_LABELS;

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:category`;
  const rate = await checkRateLimit(rateKey, 20, 60_000);
  if (!rate.ok) {
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const category = String(body?.category ?? "").trim() as CategoryKey;
  const snapshot = body?.snapshot ?? null;
  const snapshotWeightGrams = toNumber(snapshot?.weight_grams);
  let computedPlateWeight: number | null = null;

  if (!(category in CATEGORY_LABELS)) {
    return apiError(req, 400, "INVALID_CATEGORY", "Categoria invalida");
  }

  const { data: device, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id, device_id, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  await logAudit({
    event_type: "manual_bowl_category",
    actor_id: user.id,
    entity_type: "device",
    entity_id: device.id,
    payload: {
      device_id: device.device_id,
      category,
      category_label: CATEGORY_LABELS[category],
      source: "today",
      snapshot: snapshot
        ? {
            weight_grams: toNumber(snapshot?.weight_grams),
            plate_weight_grams: toNumber(snapshot?.plate_weight_grams),
            content_weight_grams: toNumber(snapshot?.content_weight_grams),
            sensor_recorded_at: snapshot?.sensor_recorded_at ?? null,
          }
        : null,
    },
  });

  if (category === "kpcl_con_plato" && snapshotWeightGrams !== null) {
    const { data: lastEmpty } = await supabaseServer
      .from("audit_events")
      .select("payload, created_at")
      .eq("entity_type", "device")
      .eq("entity_id", device.id)
      .eq("event_type", "manual_bowl_category")
      .contains("payload", { category: "kpcl_sin_plato" })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const emptyWeight =
      toNumber(lastEmpty?.payload?.snapshot?.weight_grams) ??
      toNumber(lastEmpty?.payload?.weight_grams);

    if (emptyWeight !== null) {
      const plateWeight = Math.max(0, snapshotWeightGrams - emptyWeight);
      computedPlateWeight = plateWeight;
      await supabaseServer
        .from("devices")
        .update({ plate_weight_grams: plateWeight })
        .eq("id", device.id)
        .eq("owner_id", user.id);
    }
  }

  logRequestEnd(req, startedAt, 200, {
    device_id: device.device_id,
    category,
  });

  return NextResponse.json({
    ok: true,
    device_id: device.device_id,
    category,
    category_label: CATEGORY_LABELS[category],
    plate_weight_grams: computedPlateWeight,
  });
}
