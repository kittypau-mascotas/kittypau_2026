import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../_utils";

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error);
  }

  const { supabase, user } = auth;
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("device_id");
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const limit = limitParam ? Number(limitParam) : 50;
  const paginate = Boolean(limitParam || cursor);

  if (!deviceId) {
    return apiError(req, 400, "MISSING_DEVICE_ID", "device_id is required");
  }

  if (limitParam) {
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      return apiError(
        req,
        400,
        "INVALID_LIMIT",
        "limit must be between 1 and 200"
      );
    }
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

  let query = supabase
    .from("readings")
    .select("*")
    .eq("device_id", deviceId)
    .order("recorded_at", { ascending: false })
    .limit(Number.isFinite(limit) ? limit : 50);

  if (cursor) {
    query = query.lt("recorded_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  if (!paginate) {
    logRequestEnd(req, startedAt, 200, { count: data?.length ?? 0 });
    return NextResponse.json(data ?? []);
  }

  const nextCursor =
    data && data.length > 0 ? data[data.length - 1]?.recorded_at ?? null : null;

  logRequestEnd(req, startedAt, 200, {
    count: data?.length ?? 0,
    next_cursor: nextCursor,
  });
  return NextResponse.json({ data: data ?? [], next_cursor: nextCursor });
}
