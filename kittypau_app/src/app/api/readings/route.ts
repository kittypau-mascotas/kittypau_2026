import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../_utils";

export async function handleReadingsGet(
  req: NextRequest,
  startedAt: number,
  auth: { supabase: SupabaseClient; userId: string },
) {
  const { supabase, userId } = auth;
  const { searchParams } = new URL(req.url);
  const deviceId =
    searchParams.get("device_id") ?? searchParams.get("device_uuid");
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = limitParam ? Number(limitParam) : 50;
  const paginate = Boolean(limitParam || cursor);

  if (!deviceId) {
    return apiError(req, 400, "MISSING_DEVICE_ID", "device_id is required");
  }

  if (limitParam) {
    if (!Number.isFinite(limit) || limit < 1 || limit > 5000) {
      return apiError(
        req,
        400,
        "INVALID_LIMIT",
        "limit must be between 1 and 5000",
      );
    }
  }

  if (from) {
    const parsedFrom = new Date(from);
    if (Number.isNaN(parsedFrom.getTime())) {
      return apiError(
        req,
        400,
        "INVALID_FROM",
        "from must be a valid ISO date",
      );
    }
  }

  if (to) {
    const parsedTo = new Date(to);
    if (Number.isNaN(parsedTo.getTime())) {
      return apiError(req, 400, "INVALID_TO", "to must be a valid ISO date");
    }
  }

  if (from && to) {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    if (fromMs > toMs) {
      return apiError(
        req,
        400,
        "INVALID_RANGE",
        "from must be before or equal to to",
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

  if (device.owner_id !== userId) {
    return apiError(req, 403, "FORBIDDEN", "Forbidden");
  }

  const applyFilters = <
    T extends {
      lt: (column: string, value: string) => T;
      gte: (column: string, value: string) => T;
      lte: (column: string, value: string) => T;
    },
  >(
    q: T,
  ): T => {
    let next = q;
    if (cursor) {
      next = next.lt("recorded_at", cursor) as T;
    }
    if (from) {
      next = next.gte("recorded_at", from) as T;
    }
    if (to) {
      next = next.lte("recorded_at", to) as T;
    }
    return next;
  };

  const baseSelect =
    "id,device_id,recorded_at,weight_grams,water_ml,flow_rate,temperature,humidity,light_percent,battery_level";
  const extendedSelect = `${baseSelect},battery_voltage,battery_state,battery_source,battery_is_estimated`;
  const queryLimit = Number.isFinite(limit) ? limit : 50;

  const runReadingsQuery = async (selectClause: string) =>
    applyFilters(
      supabase
        .from("readings")
        .select(selectClause)
        .eq("device_id", deviceId)
        .order("recorded_at", { ascending: false })
        .limit(queryLimit),
    );

  let { data, error } = await runReadingsQuery(extendedSelect);

  if (
    error &&
    /(column|schema cache).*(battery_voltage|battery_state|battery_source|battery_is_estimated)/i.test(
      error.message,
    )
  ) {
    ({ data, error } = await runReadingsQuery(baseSelect));
  }

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  const readingsRows = (data ?? []) as Array<{ recorded_at?: string | null }>;

  if (!paginate) {
    logRequestEnd(req, startedAt, 200, { count: readingsRows.length });
    return NextResponse.json(data ?? []);
  }

  const nextCursor =
    readingsRows.length > 0
      ? (readingsRows[readingsRows.length - 1]?.recorded_at ?? null)
      : null;

  logRequestEnd(req, startedAt, 200, {
    count: readingsRows.length,
    next_cursor: nextCursor,
  });
  return NextResponse.json({ data: data ?? [], next_cursor: nextCursor });
}

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { supabase, user } = auth;
  return handleReadingsGet(req, startedAt, { supabase, userId: user.id });
}
