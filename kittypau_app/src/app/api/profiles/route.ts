import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  enforceBodySize,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../_utils";
import { logAudit } from "../_audit";
import { checkRateLimit, getRateKeyFromRequest } from "../_rate-limit";

const ALLOWED_USER_STEPS = new Set([
  "not_started",
  "user_profile",
  "pet_profile",
  "device_link",
  "completed",
]);

function normalizeString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value as string;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  logRequestEnd(req, startedAt, 200);
  return NextResponse.json(data ?? null, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { supabase, user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:profiles_put`;
  const rate = await checkRateLimit(rateKey, 30, 60_000);
  if (!rate.ok) {
    return apiError(
      req,
      429,
      "RATE_LIMITED",
      "Too many requests",
      undefined,
      { "Retry-After": String(rate.retryAfter) }
    );
  }
  let body: Record<string, unknown>;

  const sizeError = enforceBodySize(req, 8_000);
  if (sizeError) return sizeError;

  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON");
  }

  const step = body.user_onboarding_step;
  if (step && !ALLOWED_USER_STEPS.has(String(step))) {
    return apiError(
      req,
      400,
      "INVALID_USER_STEP",
      "Invalid user_onboarding_step"
    );
  }

  const updatePayload: Record<string, unknown> = {};
  const allowedFields = [
    "auth_provider",
    "user_name",
    "is_owner",
    "owner_name",
    "care_rating",
    "phone_number",
    "notification_channel",
    "city",
    "country",
    "photo_url",
    "user_onboarding_step",
  ];

  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updatePayload[key] = body[key];
    }
  }

  for (const key of [
    "auth_provider",
    "user_name",
    "owner_name",
    "phone_number",
    "notification_channel",
    "city",
    "country",
    "photo_url",
  ]) {
    if (key in updatePayload) {
      updatePayload[key] = normalizeString(updatePayload[key]);
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError(req, 400, "NO_FIELDS", "No fields to update");
  }

  if (
    updatePayload.user_name !== undefined &&
    updatePayload.user_name !== null &&
    typeof updatePayload.user_name !== "string"
  ) {
    return apiError(req, 400, "INVALID_USER_NAME", "user_name must be a string");
  }

  if (
    updatePayload.is_owner !== undefined &&
    updatePayload.is_owner !== null &&
    typeof updatePayload.is_owner !== "boolean"
  ) {
    return apiError(req, 400, "INVALID_IS_OWNER", "is_owner must be a boolean");
  }

  if (
    updatePayload.care_rating !== undefined &&
    updatePayload.care_rating !== null &&
    typeof updatePayload.care_rating !== "number"
  ) {
    return apiError(
      req,
      400,
      "INVALID_CARE_RATING",
      "care_rating must be a number"
    );
  }

  if (
    typeof updatePayload.care_rating === "number" &&
    (updatePayload.care_rating < 1 || updatePayload.care_rating > 10)
  ) {
    return apiError(
      req,
      400,
      "CARE_RATING_OUT_OF_RANGE",
      "care_rating must be between 1 and 10"
    );
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const payload = {
    id: user.id,
    email: user.email ?? null,
    ...updatePayload,
  };

  const { data, error } = existing
    ? await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id)
        .select()
        .single()
    : await supabase.from("profiles").insert(payload).select().single();

  if (error) {
    return apiError(req, 500, "SUPABASE_ERROR", error.message);
  }

  await logAudit({
    event_type: existing ? "profile_updated" : "profile_created",
    actor_id: user.id,
    entity_type: "profile",
    entity_id: user.id,
    payload: { fields: Object.keys(updatePayload) },
  });

  logRequestEnd(req, startedAt, 200, { profile_id: user.id });
  return NextResponse.json(data, { status: 200 });
}
