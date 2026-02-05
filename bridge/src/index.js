require("dotenv").config();
const mqtt = require("mqtt");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

const MQTT_HOST = requireEnv("MQTT_HOST");
const MQTT_PORT = requireEnv("MQTT_PORT");
const MQTT_USERNAME = requireEnv("MQTT_USERNAME");
const MQTT_PASSWORD = requireEnv("MQTT_PASSWORD");
const MQTT_TOPIC = process.env.MQTT_TOPIC || "kittypau/+/telemetry";
const WEBHOOK_URL = requireEnv("WEBHOOK_URL");
const WEBHOOK_TOKEN = requireEnv("WEBHOOK_TOKEN");

const url = `mqtts://${MQTT_HOST}:${MQTT_PORT}`;

const client = mqtt.connect(url, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  protocol: "mqtts",
  rejectUnauthorized: true,
  reconnectPeriod: 3000,
});

client.on("connect", () => {
  console.log("MQTT connected:", url);
  client.subscribe(MQTT_TOPIC, { qos: 0 }, (err) => {
    if (err) {
      console.error("Subscribe error:", err.message);
    } else {
      console.log("Subscribed to:", MQTT_TOPIC);
    }
  });
});

client.on("message", async (topic, payload) => {
  let body;
  try {
    body = JSON.parse(payload.toString());
  } catch (err) {
    console.error("Invalid JSON payload:", err.message);
    return;
  }

  // Si el payload no trae device_code, intentamos extraerlo del topic:
  // Ejemplo: kittypau/KPCL001/telemetry
  if (!body.deviceCode && !body.deviceId && !body.device_id) {
    const parts = topic.split("/");
    if (parts.length >= 2) {
      const code = parts[1];
      if (code && code.startsWith("KPCL")) {
        body.deviceCode = code;
      }
    }
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-token": WEBHOOK_TOKEN,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Webhook error:", res.status, text);
      return;
    }

    console.log("Webhook ok");
  } catch (err) {
    console.error("Webhook request failed:", err.message);
  }
});

client.on("error", (err) => {
  console.error("MQTT error:", err.message);
});
