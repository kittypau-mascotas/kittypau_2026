import { NextRequest, NextResponse } from "next/server";
import { apiError, getUserClient } from "../_utils";
import { checkRateLimit, getRateKeyFromRequest } from "../_rate-limit";

const ALLOWED_TYPE = new Set(["cat", "dog"]);
const ALLOWED_PET_STATE = new Set([
  "created",
  "completed_profile",
  "device_pending",
  "device_linked",
  "inactive",
  "archived",
]);
const ALLOWED_PET_STEP = new Set([
  "not_started",
  "pet_type",
  "pet_profile",
  "pet_health",
  "pet_confirm",
]);

function normalizeString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value as string;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error);
  }

  const { supabase, user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:pets_post`;
  const rate = checkRateLimit(rateKey, 30, 60_000);
  if (!rate.ok) {
    return apiError(
      req,
      429,
      "RATE_LIMITED",
      "Too many requests",
      undefined,
      { "Retry-After": String(rate.retryAfter) }
    );
  }
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON");
  }

  const payload = {
    user_id: user.id,
    name: body?.name,
    type: body?.type,
    origin: body?.origin ?? null,
    is_neutered: body?.is_neutered ?? null,
    has_neuter_tattoo: body?.has_neuter_tattoo ?? null,
    has_microchip: body?.has_microchip ?? null,
    living_environment: body?.living_environment ?? null,
    size: body?.size ?? null,
    age_range: body?.age_range ?? null,
    weight_kg: body?.weight_kg ?? null,
    activity_level: body?.activity_level ?? null,
    alone_time: body?.alone_time ?? null,
    has_health_condition: body?.has_health_condition ?? null,
    health_notes: body?.health_notes ?? null,
    photo_url: body?.photo_url ?? null,
    pet_state: body?.pet_state ?? "created",
    pet_onboarding_step: body?.pet_onboarding_step ?? null,
  };

  payload.name = normalizeString(payload.name);
  payload.type = normalizeString(payload.type);
  payload.origin = normalizeString(payload.origin);
  payload.living_environment = normalizeString(payload.living_environment);
  payload.size = normalizeString(payload.size);
  payload.age_range = normalizeString(payload.age_range);
  payload.activity_level = normalizeString(payload.activity_level);
  payload.alone_time = normalizeString(payload.alone_time);
  payload.health_notes = normalizeString(payload.health_notes);
  payload.photo_url = normalizeString(payload.photo_url);

  if (!payload.name || !payload.type) {
    return apiError(req, 400, "MISSING_FIELDS", "name and type are required");
  }

  if (!ALLOWED_TYPE.has(String(payload.type))) {
    return apiError(req, 400, "INVALID_TYPE", "Invalid type");
  }

  if (body?.weight_kg !== undefined && typeof body.weight_kg !== "number") {
    return apiError(req, 400, "INVALID_WEIGHT", "weight_kg must be a number");
  }

  if (payload.pet_state && !ALLOWED_PET_STATE.has(String(payload.pet_state))) {
    return apiError(req, 400, "INVALID_PET_STATE", "Invalid pet_state");
  }

  if (
    payload.pet_onboarding_step &&
    !ALLOWED_PET_STEP.has(String(payload.pet_onboarding_step))
  ) {
    return apiError(
      req,
      400,
      "INVALID_PET_STEP",
      "Invalid pet_onboarding_step"
    );
  }

  const { data, error } = await supabase
    .from("pets")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  return NextResponse.json(data, { status: 201 });
}
