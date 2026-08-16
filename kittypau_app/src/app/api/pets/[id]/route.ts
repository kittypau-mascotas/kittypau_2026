import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  enforceBodySize,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../_utils";
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
const ALLOWED_SEX = new Set(["macho", "hembra", "no_estoy_seguro"]);
const ALLOWED_ORIGIN = new Set([
  "comprado",
  "adoptado_refugio",
  "rescatado_calle",
  "regalado",
  "nacido_en_casa",
  "otro",
]);
// Mismas listas/fuentes que pets/route.ts (POST) — ver comentario ahí.
const ALLOWED_BREEDS_DOG = new Set([
  "mestizo_quiltro",
  "poodle",
  "yorkshire_terrier",
  "dachshund",
  "pastor_aleman",
  "chihuahua",
  "fox_terrier",
  "bulldog_frances",
  "pug",
  "pitbull_terrier_americano",
  "otra",
]);
const ALLOWED_BREEDS_CAT = new Set([
  "domestico_pelo_corto",
  "domestico_pelo_largo",
  "persa",
  "siames",
  "maine_coon",
  "bengali",
  "exotico_pelo_corto",
  "british_shorthair",
  "esfinge",
  "otra",
]);
const MIXED_BREED_VALUES = new Set([
  "mestizo_quiltro",
  "domestico_pelo_corto",
  "domestico_pelo_largo",
]);

function normalizeString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value as string;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function weightRangeFor(type: unknown): [number, number] {
  if (type === "dog") return [0.5, 90];
  if (type === "cat") return [0.5, 15];
  return [0, 50];
}

function validateBreeds(breeds: unknown, type: unknown): string | null {
  if (breeds === undefined || breeds === null) return null;
  if (!Array.isArray(breeds)) return "breeds must be an array";
  if (breeds.length > 3) return "breeds must have at most 3 items";
  const allowed = type === "dog" ? ALLOWED_BREEDS_DOG : ALLOWED_BREEDS_CAT;
  for (const b of breeds) {
    if (typeof b !== "string" || !allowed.has(b)) return `invalid breed: ${b}`;
  }
  if (
    breeds.some((b) => MIXED_BREED_VALUES.has(b as string)) &&
    breeds.length > 1
  ) {
    return "mestizo/doméstico es excluyente con otras razas";
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { supabase, user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:pets_patch`;
  const rate = await checkRateLimit(rateKey, 30, 60_000);
  if (!rate.ok) {
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
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
      "Invalid pet_onboarding_step",
    );
  }

  if (body.sex && !ALLOWED_SEX.has(String(body.sex))) {
    return apiError(req, 400, "INVALID_SEX", "Invalid sex");
  }

  if (body.origin && !ALLOWED_ORIGIN.has(String(body.origin))) {
    return apiError(req, 400, "INVALID_ORIGIN", "Invalid origin");
  }

  if (body.weight_kg !== undefined && typeof body.weight_kg !== "number") {
    return apiError(req, 400, "INVALID_WEIGHT", "weight_kg must be a number");
  }
  // Rango completo (por especie) se valida más abajo, después de leer pet.type — acá
  // solo se descarta lo que ni siquiera es un número.

  for (const key of [
    "food_normal_min_g",
    "food_normal_max_g",
    "water_normal_min_ml",
    "water_normal_max_ml",
  ] as const) {
    if (
      body[key] !== undefined &&
      body[key] !== null &&
      typeof body[key] !== "number"
    ) {
      return apiError(
        req,
        400,
        "INVALID_LIMIT",
        `${key} must be a number or null`,
      );
    }
    if (
      typeof body[key] === "number" &&
      ((body[key] as number) < 0 || (body[key] as number) > 10000)
    ) {
      return apiError(
        req,
        400,
        "LIMIT_OUT_OF_RANGE",
        `${key} must be between 0 and 10000`,
      );
    }
  }

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, user_id, type")
    .eq("id", petId)
    .single();

  if (petError || !pet) {
    return apiError(req, 404, "PET_NOT_FOUND", "Pet not found");
  }

  if (pet.user_id !== user.id) {
    return apiError(req, 403, "FORBIDDEN", "Forbidden");
  }

  if (typeof body.weight_kg === "number") {
    const [min, max] = weightRangeFor(pet.type);
    if (body.weight_kg < min || body.weight_kg > max) {
      return apiError(
        req,
        400,
        "WEIGHT_OUT_OF_RANGE",
        `weight_kg must be between ${min} and ${max} for this type`,
      );
    }
  }

  const breedsError = validateBreeds(body.breeds, pet.type);
  if (breedsError) {
    return apiError(req, 400, "INVALID_BREEDS", breedsError);
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
    "food_normal_min_g",
    "food_normal_max_g",
    "water_normal_min_ml",
    "water_normal_max_ml",
    "sex",
    "microchip_number",
    "birth_date",
    "intake_date",
    "health_profile",
    "feeding_profile",
    "health_profile_completed_at",
    "feeding_profile_completed_at",
    "origin_habitat_profile",
    "origin_habitat_completed_at",
    "breeds",
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
    "sex",
    "microchip_number",
    "birth_date",
    "intake_date",
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

  logRequestEnd(req, startedAt, 200, { pet_id: petId });
  return NextResponse.json(data, { status: 200 });
}
