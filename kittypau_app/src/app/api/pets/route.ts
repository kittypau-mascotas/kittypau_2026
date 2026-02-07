import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "../_utils";

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

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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

  if (!payload.name || !payload.type) {
    return NextResponse.json(
      { error: "name and type are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPE.has(String(payload.type))) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (body?.weight_kg !== undefined && typeof body.weight_kg !== "number") {
    return NextResponse.json(
      { error: "weight_kg must be a number" },
      { status: 400 }
    );
  }

  if (payload.pet_state && !ALLOWED_PET_STATE.has(String(payload.pet_state))) {
    return NextResponse.json({ error: "Invalid pet_state" }, { status: 400 });
  }

  if (
    payload.pet_onboarding_step &&
    !ALLOWED_PET_STEP.has(String(payload.pet_onboarding_step))
  ) {
    return NextResponse.json(
      { error: "Invalid pet_onboarding_step" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("pets")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
