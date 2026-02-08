import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../_utils";

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { supabase, user } = auth;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_onboarding_step")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return apiError(req, 500, "SUPABASE_ERROR", profileError.message);
  }

  const { count: petCount, error: petError } = await supabase
    .from("pets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (petError) {
    return apiError(req, 500, "SUPABASE_ERROR", petError.message);
  }

  const { count: deviceCount, error: deviceError } = await supabase
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (deviceError) {
    return apiError(req, 500, "SUPABASE_ERROR", deviceError.message);
  }

  const pets = petCount ?? 0;
  const devices = deviceCount ?? 0;

  logRequestEnd(req, startedAt, 200, { petCount: pets, deviceCount: devices });
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
