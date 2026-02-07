import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "../../_utils";

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_onboarding_step")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { count: petCount, error: petError } = await supabase
    .from("pets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (petError) {
    return NextResponse.json({ error: petError.message }, { status: 500 });
  }

  const { count: deviceCount, error: deviceError } = await supabase
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (deviceError) {
    return NextResponse.json({ error: deviceError.message }, { status: 500 });
  }

  const pets = petCount ?? 0;
  const devices = deviceCount ?? 0;

  return NextResponse.json(
    {
      userStep: profile?.user_onboarding_step ?? null,
      hasPet: pets > 0,
      hasDevice: devices > 0,
      petCount: pets,
      deviceCount: devices,
    },
    { status: 200 }
  );
}
