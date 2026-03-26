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
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
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

async function countInRange(client, table, column, startIso, endIso) {
  const { count, error } = await client
    .from(table)
    .select('*', { head: true, count: 'exact' })
    .gte(column, startIso)
    .lt(column, endIso);
  if (error) throw error;
  return count ?? 0;
}

function isoDay(offsetDays) {
  return new Date(Date.UTC(2026, 2, 11 + offsetDays, 3, 0, 0, 0)).toISOString();
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
  const days = [];

  for (let i = 0; i < 15; i += 1) {
    const start = isoDay(i);
    const end = isoDay(i + 1);
    const date = new Date(start).toISOString().slice(0, 10);
    const readings = await countInRange(supabase, 'readings', 'recorded_at', start, end);
    const sensorByDevice = await countInRange(supabase, 'sensor_readings', 'device_timestamp', start, end);
    const sensorByIngest = await countInRange(supabase, 'sensor_readings', 'ingested_at', start, end);
    days.push({ date, readings, sensorByDevice, sensorByIngest });
  }

  const totals = days.reduce(
    (acc, row) => {
      acc.readings += row.readings;
      acc.sensorByDevice += row.sensorByDevice;
      acc.sensorByIngest += row.sensorByIngest;
      return acc;
    },
    { readings: 0, sensorByDevice: 0, sensorByIngest: 0 }
  );

  console.log(JSON.stringify({ days, totals }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
