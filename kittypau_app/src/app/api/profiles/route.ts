import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "../_utils";

const ALLOWED_USER_STEPS = new Set([
  "not_started",
  "user_profile",
  "pet_profile",
  "device_link",
  "completed",
]);

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function PUT(req: NextRequest) {
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

  const step = body.user_onboarding_step;
  if (step && !ALLOWED_USER_STEPS.has(String(step))) {
    return NextResponse.json(
      { error: "Invalid user_onboarding_step" },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, unknown> = {};
  const allowedFields = [
    "auth_provider",
    "user_name",
    "is_owner",
    "owner_name",
    "care_rating",
    "phone_number",
    "notification_channel",
    "city",
    "country",
    "user_onboarding_step",
  ];

  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updatePayload[key] = body[key];
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (
    updatePayload.user_name !== undefined &&
    updatePayload.user_name !== null &&
    typeof updatePayload.user_name !== "string"
  ) {
    return NextResponse.json(
      { error: "user_name must be a string" },
      { status: 400 }
    );
  }

  if (
    updatePayload.is_owner !== undefined &&
    updatePayload.is_owner !== null &&
    typeof updatePayload.is_owner !== "boolean"
  ) {
    return NextResponse.json(
      { error: "is_owner must be a boolean" },
      { status: 400 }
    );
  }

  if (
    updatePayload.care_rating !== undefined &&
    updatePayload.care_rating !== null &&
    typeof updatePayload.care_rating !== "number"
  ) {
    return NextResponse.json(
      { error: "care_rating must be a number" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const payload = {
    id: user.id,
    email: user.email ?? null,
    ...updatePayload,
  };

  const { data, error } = existing
    ? await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id)
        .select()
        .single()
    : await supabase.from("profiles").insert(payload).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
