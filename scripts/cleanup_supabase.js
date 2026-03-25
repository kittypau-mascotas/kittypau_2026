const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
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
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getExactCount(client, table, queryFn) {
  let query = client.from(table).select('id', { head: true, count: 'exact' });
  if (typeof queryFn === 'function') {
    query = queryFn(query);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function getFirstValue(client, table, column, queryFn) {
  let query = client.from(table).select(column).order(column, { ascending: true }).limit(1);
  if (typeof queryFn === 'function') {
    query = queryFn(query);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0]?.[column] ?? null;
}

async function runDelete(label, query) {
  const { error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function deleteWindowed(client, label, table, column, startValue, endValue, extraFilter) {
  let start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`${label}: invalid start value ${startValue}`);
  }
  if (Number.isNaN(end.getTime())) {
    throw new Error(`${label}: invalid end value ${endValue}`);
  }

  let total = 0;
  while (start < end) {
    const next = new Date(Math.min(start.getTime() + 24 * 60 * 60 * 1000, end.getTime()));
    let query = client
      .from(table)
      .delete()
      .gte(column, start.toISOString())
      .lt(column, next.toISOString());
    if (typeof extraFilter === 'function') {
      query = extraFilter(query, start, next);
    }
    const { data, count, error } = await query.select('id', { count: 'exact' });
    if (error) {
      throw new Error(`${label} [${start.toISOString()} -> ${next.toISOString()}]: ${error.message}`);
    }
    total += count ?? 0;
    console.log(`${label} [${start.toISOString()} -> ${next.toISOString()}]: deleted ${count ?? 0}`);
    if (data && data.length > 0) {
      console.log(`${label} sample ids: ${data.slice(0, 3).map((row) => row.id).join(', ')}`);
    }
    start = next;
  }

  return total;
}

async function main() {
  const rootEnv = loadEnv(path.resolve(__dirname, '..', '.env.local'));
  const appEnv = loadEnv(path.resolve(__dirname, '..', 'kittypau_app', '.env.local'));
  const notebookEnv = loadEnv(
    path.resolve(__dirname, '..', 'Analisis_Estadistico_ML_IA', 'notebooks', '.env.notebook.local')
  );

  const mainUrl = rootEnv.SUPABASE_URL || appEnv.SUPABASE_URL;
  const mainKey = rootEnv.SUPABASE_SERVICE_ROLE_KEY || appEnv.SUPABASE_SERVICE_ROLE_KEY;
  const analyticsUrl = notebookEnv.SUPABASE_ANALYTICS_URL;
  const analyticsKey =
    notebookEnv.SUPABASE_ANALYTICS_SERVICE_ROLE_KEY || notebookEnv.SUPABASE_ANALYTICS_SERVICE_KEY;

  if (!mainUrl || !mainKey) {
    throw new Error('Missing main Supabase credentials in local env files.');
  }

  const main = makeClient(mainUrl, mainKey);
  const analytics = makeClient(analyticsUrl, analyticsKey);
  const cutoffIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const cutoffDate = cutoffIso.slice(0, 10);
  const nowIso = new Date().toISOString();

  const { data: device, error: deviceError } = await main
    .from('devices')
    .select('id, device_id')
    .eq('device_id', 'KPCL0034')
    .maybeSingle();
  if (deviceError) throw deviceError;

  const deviceUuid = device?.id ?? null;

  console.log(`Cutoff UTC: ${cutoffIso}`);
  console.log(`KPCL0034 UUID: ${deviceUuid || 'not found'}`);

  const before = {
    readings_kpcl: deviceUuid
      ? await getExactCount(main, 'readings', (q) => q.eq('device_id', deviceUuid))
      : 0,
    readings_old: await getExactCount(main, 'readings', (q) => q.lt('recorded_at', cutoffIso)),
    sensor_kpcl: await getExactCount(main, 'sensor_readings', (q) =>
      q.eq('device_id', 'KPCL0034')
    ),
    sensor_old_ts: await getExactCount(main, 'sensor_readings', (q) =>
      q.lt('device_timestamp', cutoffIso)
    ),
    sensor_old_ingest: await getExactCount(main, 'sensor_readings', (q) =>
      q.lt('ingested_at', cutoffIso)
    ),
  };
  console.log('Main before:', before);

  if (deviceUuid) {
    await runDelete(
      'delete readings KPCL0034',
      main.from('readings').delete().eq('device_id', deviceUuid)
    );
  }

  const oldestReading = (await getFirstValue(main, 'readings', 'recorded_at', (q) =>
    q.lt('recorded_at', cutoffIso)
  )) || cutoffIso;
  await deleteWindowed(main, 'delete readings old', 'readings', 'recorded_at', oldestReading, cutoffIso);

  const oldestSensorTs = (await getFirstValue(main, 'sensor_readings', 'device_timestamp', (q) =>
    q.lt('device_timestamp', cutoffIso)
  )) || cutoffIso;
  await deleteWindowed(
    main,
    'delete sensor_readings old by device_timestamp',
    'sensor_readings',
    'device_timestamp',
    oldestSensorTs,
    cutoffIso
  );

  const oldestSensorIngest = (await getFirstValue(main, 'sensor_readings', 'ingested_at', (q) =>
    q.lt('ingested_at', cutoffIso)
  )) || cutoffIso;
  await deleteWindowed(
    main,
    'delete sensor_readings old by ingested_at',
    'sensor_readings',
    'ingested_at',
    oldestSensorIngest,
    cutoffIso
  );

  const kpclSensorStart = (await getFirstValue(main, 'sensor_readings', 'ingested_at', (q) =>
    q.eq('device_id', 'KPCL0034')
  )) || cutoffIso;
  await deleteWindowed(
    main,
    'delete sensor_readings KPCL0034',
    'sensor_readings',
    'ingested_at',
    kpclSensorStart,
    nowIso,
    (query) => query.eq('device_id', 'KPCL0034')
  );

  const after = {
    readings_kpcl: deviceUuid
      ? await getExactCount(main, 'readings', (q) => q.eq('device_id', deviceUuid))
      : 0,
    readings_old: await getExactCount(main, 'readings', (q) => q.lt('recorded_at', cutoffIso)),
    sensor_kpcl: await getExactCount(main, 'sensor_readings', (q) =>
      q.eq('device_id', 'KPCL0034')
    ),
    sensor_old_ts: await getExactCount(main, 'sensor_readings', (q) =>
      q.lt('device_timestamp', cutoffIso)
    ),
    sensor_old_ingest: await getExactCount(main, 'sensor_readings', (q) =>
      q.lt('ingested_at', cutoffIso)
    ),
  };
  console.log('Main after:', after);

  if (deviceUuid && after.readings_kpcl > 0) {
    const { data: remainingReadings, error: remainingReadingsError } = await main
      .from('readings')
      .select('id')
      .eq('device_id', deviceUuid);
    if (remainingReadingsError) throw remainingReadingsError;
    if (remainingReadings.length > 0) {
      await runDelete(
        'delete readings remaining KPCL0034',
        main.from('readings').delete().in(
          'id',
          remainingReadings.map((row) => row.id)
        )
      );
    }
  }

  if (after.sensor_kpcl > 0) {
    const { data: remainingSensors, error: remainingSensorsError } = await main
      .from('sensor_readings')
      .select('id')
      .eq('device_id', 'KPCL0034');
    if (remainingSensorsError) throw remainingSensorsError;
    if (remainingSensors.length > 0) {
      await runDelete(
        'delete sensor_readings remaining KPCL0034',
        main.from('sensor_readings').delete().in(
          'id',
          remainingSensors.map((row) => row.id)
        )
      );
    }
  }

  const finalMain = {
    readings_kpcl: deviceUuid
      ? await getExactCount(main, 'readings', (q) => q.eq('device_id', deviceUuid))
      : 0,
    readings_old: await getExactCount(main, 'readings', (q) => q.lt('recorded_at', cutoffIso)),
    sensor_kpcl: await getExactCount(main, 'sensor_readings', (q) =>
      q.eq('device_id', 'KPCL0034')
    ),
    sensor_old_ts: await getExactCount(main, 'sensor_readings', (q) =>
      q.lt('device_timestamp', cutoffIso)
    ),
    sensor_old_ingest: await getExactCount(main, 'sensor_readings', (q) =>
      q.lt('ingested_at', cutoffIso)
    ),
  };
  console.log('Main final:', finalMain);

  if (analytics) {
    const analyticsBefore = {
      sessions_kpcl: await getExactCount(analytics, 'pet_sessions', (q) =>
        q.eq('device_id', 'KPCL0034')
      ),
      sessions_old: await getExactCount(analytics, 'pet_sessions', (q) =>
        q.lt('session_start', cutoffIso)
      ),
      daily_old: await getExactCount(analytics, 'pet_daily_summary', (q) =>
        q.lt('summary_date', cutoffDate)
      ),
    };
    console.log('Analytics before:', analyticsBefore);

    const oldestSession = (await getFirstValue(analytics, 'pet_sessions', 'session_start', (q) =>
      q.lt('session_start', cutoffIso)
    )) || cutoffIso;
    await deleteWindowed(
      analytics,
      'delete pet_sessions old',
      'pet_sessions',
      'session_start',
      oldestSession,
      cutoffIso
    );

    const kpclSessionStart = (await getFirstValue(analytics, 'pet_sessions', 'session_start', (q) =>
      q.eq('device_id', 'KPCL0034')
    )) || cutoffIso;
    await deleteWindowed(
      analytics,
      'delete pet_sessions KPCL0034',
      'pet_sessions',
      'session_start',
      kpclSessionStart,
      nowIso,
      (query) => query.eq('device_id', 'KPCL0034')
    );

    await runDelete(
      'delete pet_daily_summary old',
      analytics.from('pet_daily_summary').delete().lt('summary_date', cutoffDate)
    );

    const analyticsAfter = {
      sessions_kpcl: await getExactCount(analytics, 'pet_sessions', (q) =>
        q.eq('device_id', 'KPCL0034')
      ),
      sessions_old: await getExactCount(analytics, 'pet_sessions', (q) =>
        q.lt('session_start', cutoffIso)
      ),
      daily_old: await getExactCount(analytics, 'pet_daily_summary', (q) =>
        q.lt('summary_date', cutoffDate)
      ),
    };
    console.log('Analytics after:', analyticsAfter);
  } else {
    console.log('Analytics credentials not found; skipped analytics cleanup.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
