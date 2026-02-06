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
  let body: { user_onboarding_step?: string };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const step = body.user_onboarding_step;
  if (!step || !ALLOWED_USER_STEPS.has(step)) {
    return NextResponse.json(
      { error: "Invalid user_onboarding_step" },
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
    user_onboarding_step: step,
  };

  const { data, error } = existing
    ? await supabase.from("profiles").update(payload).eq("id", user.id).select().single()
    : await supabase.from("profiles").insert(payload).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
