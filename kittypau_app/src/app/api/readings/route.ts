import { NextRequest, NextResponse } from "next/server";
import { apiError, getUserClient } from "../_utils";

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error);
  }

  const { supabase, user } = auth;
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("device_id");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 50;

  if (!deviceId) {
    return apiError(req, 400, "MISSING_DEVICE_ID", "device_id is required");
  }

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, owner_id")
    .eq("id", deviceId)
    .single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  if (device.owner_id !== user.id) {
    return apiError(req, 403, "FORBIDDEN", "Forbidden");
  }

  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .eq("device_id", deviceId)
    .order("recorded_at", { ascending: false })
    .limit(Number.isFinite(limit) ? limit : 50);

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  return NextResponse.json(data ?? []);
}
