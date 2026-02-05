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
  temperature?: number;
  humidity?: number;
  batteryLevel?: number;
  battery_level?: number;
  timestamp?: string;
};

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
