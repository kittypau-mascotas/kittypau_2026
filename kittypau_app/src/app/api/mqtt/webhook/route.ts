import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { apiError } from "../../_utils";

type WebhookPayload = {
  deviceId?: string;
  device_id?: string;
  deviceCode?: string;
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

function getDeviceCode(payload: WebhookPayload): string | null {
  return payload.deviceCode ?? null;
}

function getDeviceId(payload: WebhookPayload): string | null {
  const candidate = payload.deviceId ?? payload.device_id ?? null;
  if (!candidate) return null;
  if (/^[0-9a-fA-F-]{36}$/.test(candidate)) {
    return candidate;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-webhook-token");
  if (!token || token !== process.env.MQTT_WEBHOOK_SECRET) {
    return apiError(req, 401, "UNAUTHORIZED", "Unauthorized");
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return apiError(req, 400, "INVALID_JSON", "Invalid JSON");
  }

  const deviceId = getDeviceId(payload);
  const deviceCode = getDeviceCode(payload);
  if (!deviceId && !deviceCode) {
    return apiError(req, 400, "MISSING_DEVICE", "Missing device code");
  }

  if (deviceCode && !/^KPCL\d{4}$/.test(deviceCode)) {
    return apiError(
      req,
      400,
      "INVALID_DEVICE_CODE",
      "device_code must match KPCL0000 format"
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

  let deviceQuery = supabaseServer.from("devices").select("id, pet_id");
  if (deviceId) {
    deviceQuery = deviceQuery.eq("id", deviceId);
  } else {
    deviceQuery = deviceQuery.eq("device_code", deviceCode);
  }

  const { data: device, error: deviceError } = await deviceQuery.single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  const recordedAt = payload.timestamp
    ? new Date(payload.timestamp).toISOString()
    : new Date().toISOString();

  const { error: insertError } = await supabaseServer.from("readings").insert({
    device_id: device.id,
    pet_id: device.pet_id ?? null,
    weight_grams: weightGrams,
    water_ml: waterMl,
    flow_rate: flowRate,
    temperature,
    humidity,
    battery_level: batteryLevel,
    recorded_at: recordedAt,
  });

  if (insertError) {
    return apiError(
      req,
      500,
      "INSERT_FAILED",
      "Insert failed",
      insertError.message
    );
  }

  await supabaseServer
    .from("devices")
    .update({
      last_seen: recordedAt,
      battery_level: batteryLevel,
      status: "active",
    })
    .eq("id", device.id);

  return NextResponse.json({ success: true });
}
