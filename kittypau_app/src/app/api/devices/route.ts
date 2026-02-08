import { NextRequest, NextResponse } from "next/server";
import { apiError, getUserClient } from "../_utils";

const ALLOWED_STATUS = new Set(["active", "inactive", "maintenance"]);
const ALLOWED_DEVICE_TYPE = new Set(["food_bowl", "water_bowl"]);

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error);
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
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
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON");
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
    return apiError(req, 400, "INVALID_PET_ID", "pet_id must be a string");
  }

  if (!payload.device_code || !payload.device_type || !payload.pet_id) {
    return apiError(
      req,
      400,
      "MISSING_FIELDS",
      "device_code, device_type, and pet_id are required"
    );
  }

  if (!/^KPCL\d{4}$/.test(payload.device_code)) {
    return apiError(
      req,
      400,
      "INVALID_DEVICE_CODE",
      "device_code must match KPCL0000 format"
    );
  }

  if (!ALLOWED_DEVICE_TYPE.has(payload.device_type)) {
    return apiError(req, 400, "INVALID_DEVICE_TYPE", "Invalid device_type");
  }

  if (payload.status && !ALLOWED_STATUS.has(payload.status)) {
    return apiError(req, 400, "INVALID_STATUS", "Invalid status");
  }

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", payload.pet_id)
    .single();

  if (petError || !pet) {
    return apiError(req, 404, "PET_NOT_FOUND", "Pet not found");
  }

  const { data, error } = await supabase
    .from("devices")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const { error: petUpdateError } = await supabase
    .from("pets")
    .update({ pet_state: "device_linked" })
    .eq("id", payload.pet_id);

  if (petUpdateError) {
    await supabase.from("devices").delete().eq("id", data.id);
    return apiError(
      req,
      500,
      "PET_STATE_UPDATE_FAILED",
      "Failed to update pet_state after device create"
    );
  }

  return NextResponse.json(data, { status: 201 });
}
