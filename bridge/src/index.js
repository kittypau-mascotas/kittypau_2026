require("dotenv").config();
const mqtt = require("mqtt");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");

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

const BRIDGE_ID = process.env.BRIDGE_ID || "KPBR0001";
const BRIDGE_HEARTBEAT_URL =
  process.env.BRIDGE_HEARTBEAT_URL ||
  "https://kittypau-app.vercel.app/api/bridge/heartbeat";
const BRIDGE_HEARTBEAT_TOKEN = process.env.BRIDGE_HEARTBEAT_TOKEN || null;
const HEARTBEAT_INTERVAL_SEC = Math.max(
  10,
  Math.min(300, Number(process.env.HEARTBEAT_INTERVAL_SEC || 30))
);
const BRIDGE_DEVICE_MODEL = process.env.BRIDGE_DEVICE_MODEL || null;

const url = `mqtts://${MQTT_HOST}:${MQTT_PORT}`;

const client = mqtt.connect(url, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  protocol: "mqtts",
  rejectUnauthorized: true,
  reconnectPeriod: 3000,
});

let mqttConnected = false;
let lastMqttAtIso = null;

function pickIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const entry of ifaces[name] || []) {
      if (!entry) continue;
      if (entry.family !== "IPv4") continue;
      if (entry.internal) continue;
      return entry.address;
    }
  }
  return null;
}

function readCpuTempC() {
  try {
    const raw = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8").trim();
    const milli = Number(raw);
    if (!Number.isFinite(milli)) return null;
    return Math.round((milli / 1000) * 1000) / 1000;
  } catch {
    return null;
  }
}

function execText(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 1500 }, (err, stdout) => {
      if (err) return resolve(null);
      const text = String(stdout || "").trim();
      resolve(text.length ? text : null);
    });
  });
}

async function getWifiSsid() {
  // Works on Raspberry Pi OS with wireless-tools or iwgetid available.
  return await execText("iwgetid", ["-r"]);
}

async function getDiskUsedPct() {
  // parse `df -P /` output: use POSIX format for stable parsing.
  const out = await execText("df", ["-P", "/"]);
  if (!out) return null;
  const lines = out.split("\n").filter(Boolean);
  if (lines.length < 2) return null;
  const cols = lines[1].split(/\s+/);
  const usePct = cols[4] || null; // e.g. "19%"
  if (!usePct) return null;
  const num = Number(usePct.replace("%", ""));
  return Number.isFinite(num) ? num : null;
}

async function sendHeartbeat() {
  if (!BRIDGE_HEARTBEAT_TOKEN) {
    // Avoid spamming logs if not configured yet.
    return;
  }

  const ip = pickIp();
  const uptimeSec = Math.floor(os.uptime());
  const totalMb = Math.floor(os.totalmem() / (1024 * 1024));
  const freeMb = Math.floor(os.freemem() / (1024 * 1024));
  const usedMb = Math.max(0, totalMb - freeMb);

  const diskUsedPct = await getDiskUsedPct();
  const cpuTemp = readCpuTempC();
  const wifiSsid = await getWifiSsid();

  const body = {
    bridge_id: BRIDGE_ID,
    ip,
    uptime_sec: uptimeSec,
    mqtt_connected: mqttConnected,
    last_mqtt_at: lastMqttAtIso,
    device_model: BRIDGE_DEVICE_MODEL,
    hostname: os.hostname(),
    wifi_ssid: wifiSsid,
    wifi_ip: ip,
    ram_used_mb: usedMb,
    ram_total_mb: totalMb,
    disk_used_pct: diskUsedPct,
    cpu_temp: cpuTemp,
  };

  try {
    const res = await fetch(BRIDGE_HEARTBEAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bridge-token": BRIDGE_HEARTBEAT_TOKEN,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Heartbeat error:", res.status, text);
      return;
    }

    console.log("Heartbeat ok");
  } catch (err) {
    console.error("Heartbeat request failed:", err.message);
  }
}

client.on("connect", () => {
  console.log("MQTT connected:", url);
  mqttConnected = true;
  client.subscribe(MQTT_TOPIC, { qos: 0 }, (err) => {
    if (err) {
      console.error("Subscribe error:", err.message);
    } else {
      console.log("Subscribed to:", MQTT_TOPIC);
    }
  });
});

client.on("close", () => {
  mqttConnected = false;
});

client.on("message", async (topic, payload) => {
  let body;
  try {
    body = JSON.parse(payload.toString());
  } catch (err) {
    console.error("Invalid JSON payload:", err.message);
    return;
  }

  lastMqttAtIso = new Date().toISOString();

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

// Heartbeat loop (best-effort)
setInterval(() => {
  void sendHeartbeat();
}, HEARTBEAT_INTERVAL_SEC * 1000);

void sendHeartbeat();
