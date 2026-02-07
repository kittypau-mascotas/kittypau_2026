import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "../../_utils";

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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { id: petId } = await context.params;

  if (!petId) {
    return NextResponse.json({ error: "pet_id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.type && !ALLOWED_TYPE.has(String(body.type))) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (body.pet_state && !ALLOWED_PET_STATE.has(String(body.pet_state))) {
    return NextResponse.json({ error: "Invalid pet_state" }, { status: 400 });
  }

  if (
    body.pet_onboarding_step &&
    !ALLOWED_PET_STEP.has(String(body.pet_onboarding_step))
  ) {
    return NextResponse.json(
      { error: "Invalid pet_onboarding_step" },
      { status: 400 }
    );
  }

  if (body.weight_kg !== undefined && typeof body.weight_kg !== "number") {
    return NextResponse.json(
      { error: "weight_kg must be a number" },
      { status: 400 }
    );
  }

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, user_id")
    .eq("id", petId)
    .single();

  if (petError || !pet) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }

  if (pet.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("pets")
    .update(updatePayload)
    .eq("id", petId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
