import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "../_utils";

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
  const body = await req.json();

  const payload = {
    owner_id: user.id,
    pet_id: body?.pet_id ?? null,
    device_code: body?.device_code,
    device_type: body?.device_type,
    status: body?.status ?? "active",
    battery_level: body?.battery_level ?? null,
  };

  if (!payload.device_code || !payload.device_type) {
    return NextResponse.json(
      { error: "device_code and device_type are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("devices")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
