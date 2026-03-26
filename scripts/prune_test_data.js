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

async function fetchAll(client, table, columns) {
  const { data, error } = await client.from(table).select(columns).order('created_at', {
    ascending: true,
  });
  if (error) throw error;
  return data ?? [];
}

async function countRows(client, table) {
  const { count, error } = await client.from(table).select('id', { head: true, count: 'exact' });
  if (error) throw error;
  return count ?? 0;
}

async function deleteIds(client, table, ids, label) {
  if (!ids.length) return 0;
  const { error, count } = await client
    .from(table)
    .delete()
    .in('id', ids)
    .select('id', { count: 'exact' });
  if (error) throw new Error(`${label}: ${error.message}`);
  console.log(`${label}: deleted ${count ?? ids.length}`);
  return count ?? ids.length;
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
  const keepAnchors = new Set([
    'kittypau.mascotas@gmail.com',
    'javomauro.contacto@gmail.com',
    'kittypau.mascotas',
    'javomauro.contacto',
  ]);

  const [profiles, pets, devices] = await Promise.all([
    fetchAll(supabase, 'profiles', 'id,email,owner_name,user_name,is_owner,created_at'),
    fetchAll(supabase, 'pets', 'id,user_id,name,type,pet_state,created_at'),
    fetchAll(
      supabase,
      'devices',
      'id,owner_id,pet_id,device_id,device_type,status,device_state,created_at'
    ),
  ]);

  const keepProfileIds = new Set(
    profiles
      .filter((row) => keepAnchors.has(row.email) || keepAnchors.has(row.owner_name))
      .map((row) => row.id)
  );
  const keepPetIds = new Set(pets.filter((row) => keepProfileIds.has(row.user_id)).map((row) => row.id));
  const keepDeviceIds = new Set(devices.filter((row) => keepPetIds.has(row.pet_id)).map((row) => row.id));

  console.log(
    JSON.stringify(
      {
        keepProfileIds: [...keepProfileIds],
        keepPetIds: [...keepPetIds],
        keepDeviceIds: [...keepDeviceIds],
      },
      null,
      2
    )
  );

  const demoCount = await countRows(supabase, 'demo_ingresos');
  console.log(`demo_ingresos before: ${demoCount}`);
  const { error: demoDeleteError } = await supabase
    .from('demo_ingresos')
    .delete()
    .gte('created_at', '1900-01-01');
  if (demoDeleteError) throw demoDeleteError;

  const deviceDeleteIds = devices
    .filter((row) => !keepDeviceIds.has(row.id))
    .map((row) => row.id);
  await deleteIds(supabase, 'devices', deviceDeleteIds, 'devices prune');

  const petDeleteIds = pets.filter((row) => !keepPetIds.has(row.id)).map((row) => row.id);
  await deleteIds(supabase, 'pets', petDeleteIds, 'pets prune');

  const profileDeleteIds = profiles
    .filter((row) => !keepProfileIds.has(row.id))
    .map((row) => row.id);
  await deleteIds(supabase, 'profiles', profileDeleteIds, 'profiles prune');

  const summary = {
    demo_ingresos: await countRows(supabase, 'demo_ingresos'),
    profiles: await countRows(supabase, 'profiles'),
    pets: await countRows(supabase, 'pets'),
    devices: await countRows(supabase, 'devices'),
  };
  console.log('After cleanup:', summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
