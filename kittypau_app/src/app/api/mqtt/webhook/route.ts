import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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
  return (
    payload.deviceCode ??
    payload.deviceId ??
    payload.device_id ??
    null
  );
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-webhook-token");
  if (!token || token !== process.env.MQTT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deviceCode = getDeviceCode(payload);
  if (!deviceCode) {
    return NextResponse.json({ error: "Missing device code" }, { status: 400 });
  }

  if (!/^KPCL\d{4}$/.test(deviceCode)) {
    return NextResponse.json(
      { error: "device_code must match KPCL0000 format" },
      { status: 400 }
    );
  }

  const rangeError =
    validateRange(payload.temperature, "temperature", -10, 60) ??
    validateRange(payload.humidity, "humidity", 0, 100) ??
    validateRange(payload.batteryLevel ?? payload.battery_level, "battery_level", 0, 100) ??
    validateRange(payload.weight ?? payload.weight_grams, "weight_grams", 0, 20000) ??
    validateRange(payload.water ?? payload.water_ml, "water_ml", 0, 5000) ??
    validateRange(payload.flowRate ?? payload.flow_rate, "flow_rate", 0, 1000);

  if (rangeError) {
    return NextResponse.json({ error: rangeError }, { status: 400 });
  }

  const { data: device, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id, pet_id")
    .eq("device_code", deviceCode)
    .single();

  if (deviceError || !device) {
    return NextResponse.json(
      { error: "Device not found" },
      { status: 404 }
    );
  }

  const batteryLevel = payload.batteryLevel ?? payload.battery_level ?? null;
  const recordedAt = payload.timestamp
    ? new Date(payload.timestamp).toISOString()
    : new Date().toISOString();

  const { error: insertError } = await supabaseServer.from("readings").insert({
    device_id: device.id,
    pet_id: device.pet_id ?? null,
    weight_grams: payload.weight ?? payload.weight_grams ?? null,
    water_ml: payload.water ?? payload.water_ml ?? null,
    flow_rate: payload.flowRate ?? payload.flow_rate ?? null,
    temperature: payload.temperature ?? null,
    humidity: payload.humidity ?? null,
    battery_level: batteryLevel,
    recorded_at: recordedAt,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "Insert failed", details: insertError.message },
      { status: 500 }
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
