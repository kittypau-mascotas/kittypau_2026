import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "../_utils";

const ALLOWED_STATUS = new Set(["active", "inactive", "maintenance"]);
const ALLOWED_DEVICE_TYPE = new Set(["food_bowl", "water_bowl"]);

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("owner_id", user.id)
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
  let body: {
    pet_id?: string;
    device_code?: string;
    device_type?: string;
    status?: string;
    battery_level?: number;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = {
    owner_id: user.id,
    pet_id: body?.pet_id ?? null,
    device_code: body?.device_code,
    device_type: body?.device_type,
    status: body?.status ?? "active",
    battery_level: body?.battery_level ?? null,
  };

  if (payload.pet_id && typeof payload.pet_id !== "string") {
    return NextResponse.json({ error: "pet_id must be a string" }, { status: 400 });
  }

  if (!payload.device_code || !payload.device_type || !payload.pet_id) {
    return NextResponse.json(
      { error: "device_code, device_type, and pet_id are required" },
      { status: 400 }
    );
  }

  if (!/^KPCL\d{4}$/.test(payload.device_code)) {
    return NextResponse.json(
      { error: "device_code must match KPCL0000 format" },
      { status: 400 }
    );
  }

  if (!ALLOWED_DEVICE_TYPE.has(payload.device_type)) {
    return NextResponse.json({ error: "Invalid device_type" }, { status: 400 });
  }

  if (payload.status && !ALLOWED_STATUS.has(payload.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", payload.pet_id)
    .single();

  if (petError || !pet) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("devices")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: petUpdateError } = await supabase
    .from("pets")
    .update({ pet_state: "device_linked" })
    .eq("id", payload.pet_id);

  if (petUpdateError) {
    await supabase.from("devices").delete().eq("id", data.id);
    return NextResponse.json(
      { error: "Failed to update pet_state after device create" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
