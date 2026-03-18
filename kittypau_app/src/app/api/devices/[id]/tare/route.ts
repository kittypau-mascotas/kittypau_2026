import { NextRequest, NextResponse } from "next/server";
import mqtt from "mqtt";
import {
  apiError,
  getUserClient,
  logRequestEnd,
  startRequestTimer,
} from "../../../_utils";
import { checkRateLimit, getRateKeyFromRequest } from "../../../_rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

// Needs Node.js runtime — mqtt library uses Node.js APIs (net, tls)
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const startedAt = startRequestTimer(req);
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return apiError(req, 401, "AUTH_INVALID", auth.error ?? "Unauthorized");
  }

  const { user } = auth;
  const rateKey = `${getRateKeyFromRequest(req, user.id)}:tare`;
  const rate = await checkRateLimit(rateKey, 5, 60_000);
  if (!rate.ok) {
    return apiError(req, 429, "RATE_LIMITED", "Too many requests", undefined, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  const { id } = await context.params;

  // Verify device belongs to the authenticated user
  const { data: device, error: deviceError } = await supabaseServer
    .from("devices")
    .select("id, device_id, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (deviceError || !device) {
    return apiError(req, 404, "DEVICE_NOT_FOUND", "Device not found");
  }

  const broker = process.env.MQTT_BROKER?.trim();
  const username = process.env.MQTT_USER?.trim();
  const password = process.env.MQTT_PASS?.trim();

  if (!broker || !username || !password) {
    return apiError(
      req,
      503,
      "MQTT_NOT_CONFIGURED",
      "MQTT write credentials not configured",
    );
  }

  const topic = `${device.device_id}/cmd`;
  const payload = JSON.stringify({ command: "CALIBRATE_WEIGHT", action: "tare" });

  try {
    await publishMqtt(broker, username, password, topic, payload);
  } catch (err) {
    return apiError(
      req,
      502,
      "MQTT_PUBLISH_FAILED",
      err instanceof Error ? err.message : "Failed to publish MQTT command",
    );
  }

  logRequestEnd(req, startedAt, 200, { device_id: device.device_id });
  return NextResponse.json({ ok: true, device_id: device.device_id });
}

function publishMqtt(
  broker: string,
  username: string,
  password: string,
  topic: string,
  payload: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(`mqtts://${broker}:8883`, {
      username,
      password,
      clientId: `kp-api-tare-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 0,
    });

    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error("MQTT connect timeout"));
    }, 6000);

    client.on("connect", () => {
      client.publish(topic, payload, { qos: 1 }, (err) => {
        clearTimeout(timeout);
        client.end(true);
        if (err) reject(err);
        else resolve();
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      client.end(true);
      reject(err);
    });
  });
}
