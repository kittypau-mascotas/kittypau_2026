/**
 * Kittypau Bridge v2.6 - MQTT to Supabase (Schema Unificado)
 * Escucha mensajes MQTT de los dispositivos y los almacena en Supabase
 *
 * v2.4: Upsert bridge_heartbeats y bridge_status_live con cada STATUS de KPBR0001
 * v2.3: Publica status de la RPi (KPBR0001) cada 60s via MQTT
 * v2.2: Registra cambios de IP en ip_history (JSONB) de devices
 * v2.1: sensor_readings usa device_id (TEXT) directamente como FK
 * v2.0: Mapeo de campos: weight→weight_grams, temp→temperature, hum→humidity
 */

require('dotenv').config();
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const os = require('os');
const { execSync } = require('child_process');

// ============ CONFIGURACIÓN ============
const BRIDGE_DEVICE_ID = 'KPBR0001';

// Mapeo device_type firmware → enum SQL ('food_bowl' | 'water_bowl')
const DEVICE_TYPE_MAP = {
  'comedero':     'food_bowl',
  'bebedero':     'water_bowl',
  'comedero_cam': 'food_bowl',
  'bebedero_cam': 'water_bowl'
};
const BRIDGE_STATUS_INTERVAL_MS = 60000;
const USE_WILDCARD = true;
const DEVICES = ['KPCL0031', 'KPCL0033', 'KPCL0035', 'KPCL0036', 'KPCL0037', 'KPCL0038', 'KPCL0040', 'KPCL0041'];
const DEVICE_PREFIX = 'KPCL';

// ============ SUPABASE ============
// Usa SUPABASE_SERVICE_KEY (service_role) para bypass de RLS.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_URL || !supabaseKey) {
  console.error('[SUPABASE] Falta SUPABASE_URL o key en variables de entorno.');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

// Set de device_ids ya registrados (evita queries repetidos)
const knownDevices = new Set();

// Cache de ultima IP conocida por dispositivo (para detectar cambios)
const lastKnownIp = new Map();

// ============ MQTT ============
const mqttOptions = {
  host: process.env.MQTT_BROKER,
  port: parseInt(process.env.MQTT_PORT),
  protocol: 'mqtts',
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  rejectUnauthorized: false
};

console.log('=================================');
console.log('   Kittypau Bridge v2.4');
console.log('=================================');
console.log(`MQTT Broker: ${process.env.MQTT_BROKER}`);
console.log(`Supabase: ${process.env.SUPABASE_URL}`);
console.log(`Modo: ${USE_WILDCARD ? 'Wildcard (+/SENSORS, +/STATUS)' : 'Manual (' + DEVICES.join(', ') + ')'}`);
console.log('=================================\n');

const mqttClient = mqtt.connect(mqttOptions);

// ============ EVENTOS MQTT ============
mqttClient.on('connect', () => {
  console.log('[MQTT] Conectado a HiveMQ Cloud');

  if (USE_WILDCARD) {
    mqttClient.subscribe('+/SENSORS', (err) => {
      if (!err) console.log('[MQTT] Suscrito a +/SENSORS (wildcard)');
    });
    mqttClient.subscribe('+/STATUS', (err) => {
      if (!err) console.log('[MQTT] Suscrito a +/STATUS (wildcard)');
    });
  } else {
    DEVICES.forEach(device => {
      mqttClient.subscribe(`${device}/SENSORS`, (err) => {
        if (!err) console.log(`[MQTT] Suscrito a ${device}/SENSORS`);
      });
      mqttClient.subscribe(`${device}/STATUS`, (err) => {
        if (!err) console.log(`[MQTT] Suscrito a ${device}/STATUS`);
      });
    });
  }
});

mqttClient.on('message', async (topic, message) => {
  const timestamp = new Date().toLocaleTimeString();

  try {
    const [deviceId, type] = topic.split('/');

    if (USE_WILDCARD && DEVICE_PREFIX && !deviceId.startsWith(DEVICE_PREFIX) && deviceId !== BRIDGE_DEVICE_ID) {
      return;
    }

    const data = JSON.parse(message.toString());

    console.log(`\n[${timestamp}] ${topic}`);
    console.log(JSON.stringify(data, null, 2));

    // Auto-registrar dispositivo si es la primera vez que lo vemos
    await ensureDeviceExists(deviceId);

    if (type === 'SENSORS') {
      await handleSensorData(deviceId, data);
    } else if (type === 'STATUS') {
      await handleStatusData(deviceId, data);
      if (deviceId === BRIDGE_DEVICE_ID) {
        await updateBridgeTables(data);
      }
    }
  } catch (err) {
    console.error(`[ERROR] Procesando mensaje: ${err.message}`);
  }
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

mqttClient.on('offline', () => {
  console.log('[MQTT] Desconectado - intentando reconectar...');
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconectando...');
});

// ============ AUTO-REGISTRO ============

/**
 * Asegura que el dispositivo existe en la tabla devices.
 * Si no existe, lo crea con estado 'factory'.
 * Usa un Set en memoria para no repetir queries.
 */
async function ensureDeviceExists(deviceId) {
  if (knownDevices.has(deviceId)) return;

  const { data } = await supabase
    .from('devices')
    .select('device_id')
    .eq('device_id', deviceId)
    .single();

  if (data) {
    knownDevices.add(deviceId);
    return;
  }

  // No existe: auto-registrar
  const { error } = await supabase
    .from('devices')
    .insert({
      device_id: deviceId,
      device_state: 'factory',
      last_seen: new Date().toISOString()
    });

  if (error) {
    console.error(`[SUPABASE] Error auto-registrando ${deviceId}: ${error.message}`);
  } else {
    console.log(`[SUPABASE] + Dispositivo ${deviceId} auto-registrado (factory)`);
    knownDevices.add(deviceId);
  }
}

// ============ HANDLERS ============

async function handleSensorData(deviceId, data) {
  const { error } = await supabase
    .from('sensor_readings')
    .insert({
      device_id: deviceId,
      weight_grams: data.weight ?? null,
      temperature: data.temp ?? null,
      humidity: data.hum ?? null,
      light_lux: data.light?.lux ?? null,
      light_percent: data.light?.['%'] ?? null,
      light_condition: data.light?.condition ?? null,
      device_timestamp: data.timestamp ?? null
    });

  if (error) {
    console.error(`[SUPABASE] Error insertando sensor: ${error.message}`);
  } else {
    console.log(`[SUPABASE] ✓ Sensor data guardado para ${deviceId}`);
  }

  // Escribir también en tabla readings (UUID-based, leída por la app)
  await writeToReadings(deviceId, data);
}

async function writeToReadings(deviceId, data) {
  const { data: device, error: lookupError } = await supabase
    .from('devices')
    .select('id, pet_id')
    .eq('device_id', deviceId)
    .not('owner_id', 'is', null)
    .maybeSingle();

  if (lookupError) {
    console.error(`[READINGS] Error buscando device UUID para ${deviceId}: ${lookupError.message}`);
    return;
  }
  if (!device) return; // No reclamado por usuario, no escribir en readings

  const serverNow = Date.now();
  let recordedAt = new Date(serverNow).toISOString();
  let clockInvalid = false;

  if (data.timestamp) {
    const deviceTs = Date.parse(data.timestamp);
    if (Number.isFinite(deviceTs)) {
      if (Math.abs(serverNow - deviceTs) > 10 * 60 * 1000) {
        clockInvalid = true;
      } else {
        recordedAt = new Date(deviceTs).toISOString();
      }
    } else {
      clockInvalid = true;
    }
  }

  const { error: readingsError } = await supabase
    .from('readings')
    .upsert(
      {
        device_id: device.id,
        pet_id: device.pet_id ?? null,
        weight_grams: data.weight != null ? Math.round(data.weight) : null,
        temperature: data.temp ?? null,
        humidity: data.hum ?? null,
        recorded_at: recordedAt,
        ingested_at: new Date().toISOString(),
        clock_invalid: clockInvalid
      },
      { onConflict: 'device_id,recorded_at', ignoreDuplicates: true }
    );

  if (readingsError) {
    console.error(`[READINGS] Error upsert para ${deviceId}: ${readingsError.message}`);
  } else {
    console.log(`[READINGS] ✓ Reading sincronizado para ${deviceId} (clock_invalid=${clockInvalid})`);
  }
}

async function handleStatusData(deviceId, data) {
  const newIp = data.wifi_ip ?? null;
  const cachedIp = lastKnownIp.get(deviceId);

  // Detectar cambio de IP y registrar en ip_history
  if (newIp && cachedIp && newIp !== cachedIp) {
    await appendIpHistory(deviceId, cachedIp, data.wifi_ssid);
    console.log(`[IP-HISTORY] ${deviceId}: ${cachedIp} → ${newIp}`);
  }

  if (newIp) {
    lastKnownIp.set(deviceId, newIp);
  }

  // Actualiza campos IoT directamente por device_id (sin UUID)
  // Evita sobreescribir con null si el firmware antiguo no envía ciertos campos.
  const updateFields = {
    last_seen: new Date().toISOString(),
    device_state: 'linked'
  };

  if (data.wifi_status !== undefined) updateFields.wifi_status = data.wifi_status;
  if (data.wifi_ssid !== undefined) updateFields.wifi_ssid = data.wifi_ssid;
  if (newIp) updateFields.wifi_ip = newIp;
  if (data.sensor_health !== undefined) updateFields.sensor_health = data.sensor_health;
  if (data.device_type) updateFields.device_type = data.device_type; // guardar valor raw del firmware
  if (data.device_model) updateFields.device_model = data.device_model;

  const { error } = await supabase
    .from('devices')
    .update(updateFields)
    .eq('device_id', deviceId);

  if (error) {
    console.error(`[SUPABASE] Error actualizando device: ${error.message}`);
  } else {
    const mqttStatus = data[deviceId] || 'Unknown';
    console.log(`[SUPABASE] ✓ Status actualizado para ${deviceId} (${mqttStatus})`);
  }
}

async function appendIpHistory(deviceId, oldIp, ssid) {
  // Leer ip_history actual
  const { data: device } = await supabase
    .from('devices')
    .select('ip_history')
    .eq('device_id', deviceId)
    .single();

  const history = device?.ip_history ?? [];
  history.push({
    ip: oldIp,
    ssid: ssid ?? null,
    until: new Date().toISOString()
  });

  const { error } = await supabase
    .from('devices')
    .update({ ip_history: history })
    .eq('device_id', deviceId);

  if (error) {
    console.error(`[SUPABASE] Error guardando ip_history: ${error.message}`);
  }
}

// ============ BRIDGE TABLES UPDATE ============

async function updateBridgeTables(data) {
  const now = new Date().toISOString();

  // Upsert bridge_heartbeats (incluye telemetria completa)
  // bridge_status_live es una VIEW sobre esta tabla
  const { error } = await supabase
    .from('bridge_heartbeats')
    .upsert({
      bridge_id: BRIDGE_DEVICE_ID,
      ip: data.wifi_ip ?? null,
      uptime_sec: (data.uptime_min ?? 0) * 60,
      mqtt_connected: true,
      last_mqtt_at: now,
      last_seen: now,
      device_type: data.device_type ?? 'bridge',
      device_model: data.device_model ?? null,
      hostname: data.hostname ?? null,
      wifi_ssid: data.wifi_ssid ?? null,
      ram_used_mb: data.ram_used_mb ?? null,
      ram_total_mb: data.ram_total_mb ?? null,
      disk_used_pct: data.disk_used_pct ?? null,
      cpu_temp: data.cpu_temp ?? null
    }, { onConflict: 'bridge_id' });

  if (error) {
    console.error(`[SUPABASE] Error bridge_heartbeats: ${error.message}`);
  } else {
    console.log(`[SUPABASE] ✓ Bridge heartbeat actualizado`);
  }
}

// ============ RPi STATUS PUBLISHING ============

function getRpiStatus() {
  const cmd = (c) => { try { return execSync(c, { timeout: 5000 }).toString().trim(); } catch { return null; } };

  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);
  const usedMem = totalMem - freeMem;
  const uptimeSec = os.uptime();

  // WiFi SSID via nmcli
  const ssid = cmd("nmcli -t -f active,ssid dev wifi | grep '^yes\\|^si' | cut -d: -f2");

  // IP
  const ip = cmd("hostname -I")?.split(' ')[0] || null;

  // Disk usage
  const diskLine = cmd("df -h / | tail -1");
  const diskPct = diskLine ? parseInt(diskLine.split(/\s+/)[4]) : null;

  // CPU temp (millidegrees)
  const tempRaw = cmd("cat /sys/class/thermal/thermal_zone0/temp");
  const cpuTemp = tempRaw ? parseFloat(tempRaw) / 1000 : null;

  return {
    device_id: BRIDGE_DEVICE_ID,
    device_type: 'bridge',
    device_model: 'Raspberry Pi Zero 2 W',
    hostname: os.hostname(),
    wifi_ssid: ssid,
    wifi_ip: ip,
    uptime_min: Math.round(uptimeSec / 60),
    ram_used_mb: usedMem,
    ram_total_mb: totalMem,
    disk_used_pct: diskPct,
    cpu_temp: cpuTemp,
    bridge_status: 'active',
    timestamp: new Date().toISOString()
  };
}

function publishRpiStatus() {
  if (!mqttClient.connected) return;
  const status = getRpiStatus();
  mqttClient.publish(`${BRIDGE_DEVICE_ID}/STATUS`, JSON.stringify(status), { qos: 0 }, (err) => {
    if (err) {
      console.error(`[RPi-STATUS] Error publicando: ${err.message}`);
    } else {
      console.log(`[RPi-STATUS] ${BRIDGE_DEVICE_ID} → ${status.wifi_ssid} | ${status.wifi_ip} | RAM ${status.ram_used_mb}/${status.ram_total_mb}MB | ${status.cpu_temp}°C`);
    }
  });
}

// Publicar status inmediatamente al conectar y luego cada 60s
mqttClient.on('connect', () => {
  setTimeout(publishRpiStatus, 3000);
});
setInterval(publishRpiStatus, BRIDGE_STATUS_INTERVAL_MS);

// ============ GRACEFUL SHUTDOWN ============
process.on('SIGINT', () => {
  console.log('\n[BRIDGE] Cerrando conexiones...');
  mqttClient.end();
  process.exit(0);
});

console.log('[BRIDGE] Esperando mensajes MQTT...\n');
