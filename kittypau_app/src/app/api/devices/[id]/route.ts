import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "../../_utils";

const ALLOWED_STATUS = new Set(["active", "inactive", "maintenance"]);
const ALLOWED_DEVICE_TYPE = new Set(["food_bowl", "water_bowl"]);
const ALLOWED_DEVICE_STATE = new Set([
  "factory",
  "claimed",
  "linked",
  "offline",
  "lost",
  "error",
]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { id: deviceId } = await context.params;

  if (!deviceId) {
    return NextResponse.json({ error: "device_id is required" }, { status: 400 });
  }

  let body: {
    status?: string;
    device_state?: string;
    pet_id?: string;
    device_type?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status && !ALLOWED_STATUS.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (body.device_type && !ALLOWED_DEVICE_TYPE.has(body.device_type)) {
    return NextResponse.json({ error: "Invalid device_type" }, { status: 400 });
  }

  if (body.device_state && !ALLOWED_DEVICE_STATE.has(body.device_state)) {
    return NextResponse.json({ error: "Invalid device_state" }, { status: 400 });
  }

  if (body.pet_id === null) {
    return NextResponse.json({ error: "pet_id cannot be null" }, { status: 400 });
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

  const updatePayload: Record<string, unknown> = {};
  if (body.status) updatePayload.status = body.status;
  if (body.device_state) updatePayload.device_state = body.device_state;
  if (body.device_type) updatePayload.device_type = body.device_type;
  if (body.pet_id) updatePayload.pet_id = body.pet_id;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("devices")
    .update(updatePayload)
    .eq("id", deviceId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
