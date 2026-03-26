const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }

  return env;
}

function makeClient(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getExactCount(client, table) {
  const { count, error } = await client.from(table).select('*', { head: true, count: 'exact' });
  if (error) throw error;
  return count ?? 0;
}

async function getRange(client, table, column) {
  const { data: minRows, error: minError } = await client
    .from(table)
    .select(column)
    .order(column, { ascending: true, nullsFirst: false })
    .limit(1);
  if (minError) throw minError;

  const { data: maxRows, error: maxError } = await client
    .from(table)
    .select(column)
    .order(column, { ascending: false, nullsFirst: false })
    .limit(1);
  if (maxError) throw maxError;

  return {
    min: minRows?.[0]?.[column] ?? null,
    max: maxRows?.[0]?.[column] ?? null,
  };
}

async function main() {
  const rootEnv = loadEnv(path.resolve(__dirname, '..', '.env.local'));
  const appEnv = loadEnv(path.resolve(__dirname, '..', 'kittypau_app', '.env.local'));
  const mainUrl = rootEnv.SUPABASE_URL || appEnv.SUPABASE_URL;
  const mainKey = rootEnv.SUPABASE_SERVICE_ROLE_KEY || appEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!mainUrl || !mainKey) {
    throw new Error('Missing main Supabase credentials in local env files.');
  }

  const supabase = makeClient(mainUrl, mainKey);

  const tables = [
    { name: 'profiles', dateCols: ['created_at'] },
    { name: 'pets', dateCols: ['created_at'] },
    { name: 'devices', dateCols: ['created_at', 'last_seen', 'retired_at'] },
    { name: 'readings', dateCols: ['recorded_at', 'ingested_at'] },
    { name: 'sensor_readings', dateCols: ['device_timestamp', 'ingested_at'] },
    { name: 'audit_events', dateCols: ['created_at'] },
    { name: 'bridge_heartbeats', dateCols: ['last_seen', 'last_mqtt_at', 'created_at'] },
    { name: 'bridge_telemetry', dateCols: ['recorded_at', 'created_at'] },
    { name: 'demo_ingresos', dateCols: ['last_seen_at'] },
    { name: 'breeds', dateCols: [] },
    { name: 'pet_breeds', dateCols: [] },
  ];

  const summary = [];
  for (const table of tables) {
    const count = await getExactCount(supabase, table.name);
    const ranges = {};
    for (const column of table.dateCols) {
      ranges[column] = count > 0 ? await getRange(supabase, table.name, column) : { min: null, max: null };
    }
    summary.push({ table: table.name, count, ranges });
  }

  const { data: devices, error: devicesError } = await supabase
    .from('devices')
    .select('id,device_id,status,retired_at,created_at,ip_history,last_seen')
    .order('created_at', { ascending: false });
  if (devicesError) throw devicesError;

  const deviceUsage = {
    rows: devices.length,
    active: devices.filter((d) => d.status === 'active').length,
    retired: devices.filter((d) => d.retired_at).length,
    with_ip_history: devices.filter((d) => Array.isArray(d.ip_history) && d.ip_history.length > 0).length,
    total_ip_history_entries: devices.reduce(
      (sum, d) => sum + (Array.isArray(d.ip_history) ? d.ip_history.length : 0),
      0
    ),
    approx_ip_history_chars: devices.reduce(
      (sum, d) => sum + (d.ip_history ? JSON.stringify(d.ip_history).length : 0),
      0
    ),
    last_seen_min: devices.reduce((min, d) => (d.last_seen && (!min || d.last_seen < min) ? d.last_seen : min), null),
    last_seen_max: devices.reduce((max, d) => (d.last_seen && (!max || d.last_seen > max) ? d.last_seen : max), null),
  };

  const result = {
    summary,
    deviceUsage,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
