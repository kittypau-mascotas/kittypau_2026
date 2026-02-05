import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "../_utils";

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("device_id");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 50;

  if (!deviceId) {
    return NextResponse.json(
      { error: "device_id is required" },
      { status: 400 }
    );
  }

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, owner_id")
    .eq("id", deviceId)
    .single();

  if (deviceError || !device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  if (device.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .eq("device_id", deviceId)
    .order("recorded_at", { ascending: false })
    .limit(Number.isFinite(limit) ? limit : 50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
