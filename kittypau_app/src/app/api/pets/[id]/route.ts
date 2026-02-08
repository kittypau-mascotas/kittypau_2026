import { NextRequest, NextResponse } from "next/server";
import { apiError, enforceBodySize, getUserClient } from "../../_utils";
import { checkRateLimit, getRateKeyFromRequest } from "../../_rate-limit";

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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error);
  }

  const { supabase, user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:pets_patch`;
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
  const { id: petId } = await context.params;

  if (!petId) {
    return apiError(req, 400, "MISSING_PET_ID", "pet_id is required");
  }

  let body: Record<string, unknown>;
  try {
    const sizeError = enforceBodySize(req, 8_000);
    if (sizeError) return sizeError;
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON");
  }

  if (Object.prototype.hasOwnProperty.call(body, "type")) {
    return apiError(req, 400, "TYPE_IMMUTABLE", "type cannot be updated");
  }

  if (body.pet_state && !ALLOWED_PET_STATE.has(String(body.pet_state))) {
    return apiError(req, 400, "INVALID_PET_STATE", "Invalid pet_state");
  }

  if (
    body.pet_onboarding_step &&
    !ALLOWED_PET_STEP.has(String(body.pet_onboarding_step))
  ) {
    return apiError(
      req,
      400,
      "INVALID_PET_STEP",
      "Invalid pet_onboarding_step"
    );
  }

  if (body.weight_kg !== undefined && typeof body.weight_kg !== "number") {
    return apiError(req, 400, "INVALID_WEIGHT", "weight_kg must be a number");
  }

  if (typeof body.weight_kg === "number") {
    if (body.weight_kg < 0 || body.weight_kg > 50) {
      return apiError(
        req,
        400,
        "WEIGHT_OUT_OF_RANGE",
        "weight_kg must be between 0 and 50"
      );
    }
  }

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, user_id")
    .eq("id", petId)
    .single();

  if (petError || !pet) {
    return apiError(req, 404, "PET_NOT_FOUND", "Pet not found");
  }

  if (pet.user_id !== user.id) {
    return apiError(req, 403, "FORBIDDEN", "Forbidden");
  }

  const updatePayload: Record<string, unknown> = {};
  const allowedFields = [
    "name",
    "type",
    "origin",
    "is_neutered",
    "has_neuter_tattoo",
    "has_microchip",
    "living_environment",
    "size",
    "age_range",
    "weight_kg",
    "activity_level",
    "alone_time",
    "has_health_condition",
    "health_notes",
    "photo_url",
    "pet_state",
    "pet_onboarding_step",
  ];

  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updatePayload[key] = body[key];
    }
  }

  for (const key of [
    "name",
    "type",
    "origin",
    "living_environment",
    "size",
    "age_range",
    "activity_level",
    "alone_time",
    "health_notes",
    "photo_url",
  ]) {
    if (key in updatePayload) {
      updatePayload[key] = normalizeString(updatePayload[key]);
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError(req, 400, "NO_FIELDS", "No fields to update");
  }

  const { data, error } = await supabase
    .from("pets")
    .update(updatePayload)
    .eq("id", petId)
    .select()
    .single();

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  return NextResponse.json(data, { status: 200 });
}
