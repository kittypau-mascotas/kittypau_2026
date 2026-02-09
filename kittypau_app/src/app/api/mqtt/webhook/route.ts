import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  apiError,
  enforceBodySize,
  logInfo,
  logRequestEnd,
  startRequestTimer,
} from "../../_utils";
import { logAudit } from "../../_audit";
import { checkRateLimit, getRateKeyFromRequest } from "../../_rate-limit";

type WebhookPayload = {
  deviceId?: string;
  device_id?: string;
  deviceUuid?: string;
  device_uuid?: string;
  weight?: number;
  weight_grams?: number;
  water?: number;
  water_ml?: number;
  flowRate?: number;
  flow_rate?: number;
  temperature?: number;
  humidity?: number;
  batteryLevel?: number;
  battery_level?: number;
  timestamp?: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validateRange(
  value: unknown,
  name: string,
  min: number,
  max: number
): string | null {
  if (value === undefined || value === null) return null;
  if (!isFiniteNumber(value)) return `${name} must be a number`;
  if (value < min || value > max) return `${name} out of range`;
  return null;
}

function getDeviceId(payload: WebhookPayload): string | null {
  return payload.device_id ?? payload.deviceId ?? null;
}

function getDeviceUuid(payload: WebhookPayload): string | null {
  const candidate = payload.device_uuid ?? payload.deviceUuid ?? null;
  if (!candidate) return null;
  return /^[0-9a-fA-F-]{36}$/.test(candidate) ? candidate : null;
}

export async function POST(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const token = req.headers.get("x-webhook-token");
  if (!token || token !== process.env.MQTT_WEBHOOK_SECRET) {
    return apiError(req, 401, "UNAUTHORIZED", "Unauthorized");
  }

  const rateKey = `${getRateKeyFromRequest(req)}:webhook`;
  const rate = await checkRateLimit(rateKey, 60, 60_000);
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

  let payload: WebhookPayload;
  try {
    const sizeError = enforceBodySize(req, 10_000);
    if (sizeError) return sizeError;
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON");
  }

  const deviceId = getDeviceId(payload);
  const deviceUuid = getDeviceUuid(payload);
  if (!deviceId && !deviceUuid) {
    return apiError(req, 400, "MISSING_DEVICE", "Missing device_id");
  }

  if (deviceId && !/^KPCL\d{4}$/.test(deviceId)) {
    return apiError(
      req,
      400,
      "INVALID_DEVICE_CODE",
      "device_id must match KPCL0000 format"
    );
  }

  const weightGrams = parseNumber(payload.weight ?? payload.weight_grams);
  const waterMl = parseNumber(payload.water ?? payload.water_ml);
  const flowRate = parseNumber(payload.flowRate ?? payload.flow_rate);
  const temperature = parseNumber(payload.temperature);
  const humidity = parseNumber(payload.humidity);
  const batteryLevel = parseNumber(payload.batteryLevel ?? payload.battery_level);

  const rangeError =
    validateRange(temperature, "temperature", -10, 60) ??
    validateRange(humidity, "humidity", 0, 100) ??
    validateRange(batteryLevel, "battery_level", 0, 100) ??
    validateRange(weightGrams, "weight_grams", 0, 20000) ??
    validateRange(waterMl, "water_ml", 0, 5000) ??
    validateRange(flowRate, "flow_rate", 0, 1000);

  if (rangeError) {
    return apiError(req, 400, "OUT_OF_RANGE", rangeError);
  }

  let deviceQuery = supabaseServer
    .from("devices")
    .select("id, pet_id, device_id");
  if (deviceUuid) {
    deviceQuery = deviceQuery.eq("id", deviceUuid);
  } else if (deviceId) {
    deviceQuery = deviceQuery.eq("device_id", deviceId);
  }

  const { data: device, error: deviceError } = await deviceQuery.single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  if (deviceId && device.device_id !== deviceId) {
    return apiError(
      req,
      400,
      "DEVICE_MISMATCH",
      "device_uuid does not match device_id"
    );
  }

  const serverTimeMs = Date.now();
  const ingestedAt = new Date(serverTimeMs).toISOString();
  let recordedAt = ingestedAt;
  let clockInvalid = false;
  let deviceTimeMs: number | null = null;
  let deltaMs: number | null = null;

  if (payload.timestamp) {
    const parsed = Date.parse(payload.timestamp);
    if (Number.isFinite(parsed)) {
      deviceTimeMs = parsed;
      deltaMs = Math.abs(serverTimeMs - parsed);
      if (deltaMs > 10 * 60 * 1000) {
        clockInvalid = true;
        recordedAt = ingestedAt;
      } else {
        recordedAt = new Date(parsed).toISOString();
      }
    } else {
      clockInvalid = true;
      recordedAt = ingestedAt;
    }
  }

  const { error: insertError } = await supabaseServer
    .from("readings")
    .upsert(
      {
        device_id: device.id,
        pet_id: device.pet_id ?? null,
        weight_grams: weightGrams,
        water_ml: waterMl,
        flow_rate: flowRate,
        temperature,
        humidity,
        battery_level: batteryLevel,
        recorded_at: recordedAt,
        ingested_at: ingestedAt,
        clock_invalid: clockInvalid,
      },
      { onConflict: "device_id,recorded_at", ignoreDuplicates: true }
    );

  if (insertError) {
    return apiError(
      req,
      500,
      "INSERT_FAILED",
      "Insert failed",
      insertError.message
    );
  }

  await logAudit({
    event_type: "reading_ingested",
    actor_id: null,
    entity_type: "device",
    entity_id: device.id,
    payload: {
      device_id: deviceId ?? null,
      device_uuid: deviceUuid ?? null,
      weight_grams: weightGrams,
      water_ml: waterMl,
      flow_rate: flowRate,
    },
  });

  await supabaseServer
    .from("devices")
    .update({
      last_seen: recordedAt,
      battery_level: batteryLevel,
      status: "active",
    })
    .eq("id", device.id);

  logInfo(req, "reading_ingested", {
    device_id: device.id,
    recorded_at: recordedAt,
    ingested_at: ingestedAt,
    clock_invalid: clockInvalid,
    delta_ms: deltaMs,
    device_time_ms: deviceTimeMs,
  });

  logRequestEnd(req, startedAt, 200, {
    device_id: device.id,
    clock_invalid: clockInvalid,
  });
  return NextResponse.json({ success: true });
}

