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
import {
  normalizeBatterySource,
  resolveBatteryState,
  type BatteryState,
} from "@/lib/battery/contract";

const DUPLICATE_EXCEPTION_DEVICE_CODE = "KPCL0034";

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
  batteryVoltage?: number;
  battery_voltage?: number;
  powerSource?: string;
  power_source?: string;
  isCharging?: boolean;
  is_charging?: boolean;
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

function parseBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number")
    return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return null;
}

function estimateBatteryLevelFromVoltage(
  voltage: number | null,
): number | null {
  if (voltage === null) return null;
  const emptyV = 3.3;
  const fullV = 4.2;
  const normalized = ((voltage - emptyV) / (fullV - emptyV)) * 100;
  const clamped = Math.max(0, Math.min(100, normalized));
  return Math.round(clamped);
}

function validateRange(
  value: unknown,
  name: string,
  min: number,
  max: number,
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
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
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
      "device_id must match KPCL0000 format",
    );
  }

  const weightGrams = parseNumber(payload.weight ?? payload.weight_grams);
  const waterMl = parseNumber(payload.water ?? payload.water_ml);
  const flowRate = parseNumber(payload.flowRate ?? payload.flow_rate);
  const temperature = parseNumber(payload.temperature);
  const humidity = parseNumber(payload.humidity);
  const batteryLevel = parseNumber(
    payload.batteryLevel ?? payload.battery_level,
  );
  const batteryVoltage = parseNumber(
    payload.batteryVoltage ?? payload.battery_voltage,
  );
  const charging =
    parseBoolean(payload.isCharging ?? payload.is_charging) ?? false;
  const batterySource = normalizeBatterySource(
    payload.powerSource ?? payload.power_source,
  );
  const effectiveBatteryLevel =
    batteryLevel ?? estimateBatteryLevelFromVoltage(batteryVoltage);
  const batteryIsEstimated =
    batteryLevel === null && effectiveBatteryLevel !== null;
  const batteryState: BatteryState = resolveBatteryState(
    effectiveBatteryLevel,
    batterySource,
    charging,
  );

  const rangeError =
    validateRange(temperature, "temperature", -10, 60) ??
    validateRange(humidity, "humidity", 0, 100) ??
    validateRange(effectiveBatteryLevel, "battery_level", 0, 100) ??
    validateRange(batteryVoltage, "battery_voltage", 0, 6) ??
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
      "device_uuid does not match device_id",
    );
  }

  const allowDuplicateReadings =
    device.device_id === DUPLICATE_EXCEPTION_DEVICE_CODE;
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

  let isDuplicate = false;

  if (!allowDuplicateReadings) {
    const { data: existing } = await supabaseServer
      .from("readings")
      .select("id")
      .eq("device_id", device.id)
      .eq("recorded_at", recordedAt)
      .limit(1);

    isDuplicate = Array.isArray(existing) && existing.length > 0;
  }

  if (!isDuplicate) {
    const readingPayload = {
      device_id: device.id,
      pet_id: device.pet_id ?? null,
      weight_grams: weightGrams,
      water_ml: waterMl,
      flow_rate: flowRate,
      temperature,
      humidity,
      battery_level: effectiveBatteryLevel,
      battery_voltage: batteryVoltage,
      battery_state: batteryState,
      battery_source: batterySource,
      battery_is_estimated: batteryIsEstimated,
      recorded_at: recordedAt,
      ingested_at: ingestedAt,
      clock_invalid: clockInvalid,
    };

    const { error: insertError } = allowDuplicateReadings
      ? await supabaseServer.from("readings").insert(readingPayload)
      : await supabaseServer.from("readings").upsert(readingPayload, {
          onConflict: "device_id,recorded_at",
          ignoreDuplicates: true,
        });

    if (insertError) {
      return apiError(
        req,
        500,
        "INSERT_FAILED",
        "Insert failed",
        insertError.message,
      );
    }
  } else {
    logInfo(req, "reading_duplicate", {
      device_id: device.id,
      recorded_at: recordedAt,
    });
  }

  if (allowDuplicateReadings) {
    logInfo(req, "reading_duplicate_rule_bypassed", {
      device_id: device.id,
      device_code: device.device_id,
      recorded_at: recordedAt,
    });
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
      battery_level: effectiveBatteryLevel,
      battery_voltage: batteryVoltage,
      battery_state: batteryState,
      battery_source: batterySource,
      battery_is_estimated: batteryIsEstimated,
    },
  });

  await supabaseServer
    .from("devices")
    .update({
      last_seen: recordedAt,
      battery_level: effectiveBatteryLevel,
      battery_voltage: batteryVoltage,
      battery_state: batteryState,
      battery_source: batterySource,
      battery_is_estimated: batteryIsEstimated,
      battery_updated_at: ingestedAt,
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
    battery_level: effectiveBatteryLevel,
    battery_voltage: batteryVoltage,
    battery_state: batteryState,
    battery_source: batterySource,
    battery_is_estimated: batteryIsEstimated,
  });

  logRequestEnd(req, startedAt, 200, {
    device_id: device.id,
    clock_invalid: clockInvalid,
    idempotent: isDuplicate,
  });
  return NextResponse.json({ success: true, idempotent: isDuplicate });
}
