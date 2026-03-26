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

async function countRows(client, table, queryFn) {
  let query = client.from(table).select('id', { head: true, count: 'exact' });
  if (typeof queryFn === 'function') {
    query = queryFn(query);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function deleteWindowed(client, label, table, column, startIso, endIso) {
  let start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`${label}: invalid date range`);
  }

  let total = 0;
  while (start < end) {
    const next = new Date(Math.min(start.getTime() + 24 * 60 * 60 * 1000, end.getTime()));
    const { count, error } = await client
      .from(table)
      .delete()
      .gte(column, start.toISOString())
      .lt(column, next.toISOString())
      .select('id', { count: 'exact' });
    if (error) {
      throw new Error(`${label} [${start.toISOString()} -> ${next.toISOString()}]: ${error.message}`);
    }
    total += count ?? 0;
    console.log(`${label} [${start.toISOString()} -> ${next.toISOString()}]: deleted ${count ?? 0}`);
    start = next;
  }

  return total;
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
  const janStart = '2026-01-01T00:00:00-03:00';
  const febStart = '2026-02-01T00:00:00-03:00';

  const before = {
    readings_recorded_at: await countRows(supabase, 'readings', (q) =>
      q.gte('recorded_at', janStart).lt('recorded_at', febStart)
    ),
    sensor_device_timestamp: await countRows(supabase, 'sensor_readings', (q) =>
      q.gte('device_timestamp', janStart).lt('device_timestamp', febStart)
    ),
    sensor_ingested_at: await countRows(supabase, 'sensor_readings', (q) =>
      q.gte('ingested_at', janStart).lt('ingested_at', febStart)
    ),
  };
  console.log('Before:', before);

  await deleteWindowed(supabase, 'delete readings jan', 'readings', 'recorded_at', janStart, febStart);
  await deleteWindowed(
    supabase,
    'delete sensor_readings jan by device_timestamp',
    'sensor_readings',
    'device_timestamp',
    janStart,
    febStart
  );
  await deleteWindowed(
    supabase,
    'delete sensor_readings jan by ingested_at',
    'sensor_readings',
    'ingested_at',
    janStart,
    febStart
  );

  const after = {
    readings_recorded_at: await countRows(supabase, 'readings', (q) =>
      q.gte('recorded_at', janStart).lt('recorded_at', febStart)
    ),
    sensor_device_timestamp: await countRows(supabase, 'sensor_readings', (q) =>
      q.gte('device_timestamp', janStart).lt('device_timestamp', febStart)
    ),
    sensor_ingested_at: await countRows(supabase, 'sensor_readings', (q) =>
      q.gte('ingested_at', janStart).lt('ingested_at', febStart)
    ),
  };
  console.log('After:', after);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
