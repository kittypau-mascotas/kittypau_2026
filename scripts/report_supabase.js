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

async function countRows(client, table) {
  const { count, error } = await client.from(table).select('id', { head: true, count: 'exact' });
  if (error) throw error;
  return count ?? 0;
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

  const tables = {};
  for (const table of ['demo_ingresos', 'profiles', 'pets', 'devices']) {
    tables[table] = await countRows(supabase, table);
  }

  const { data: demo, error: demoError } = await supabase
    .from('demo_ingresos')
    .select('id,email,owner_name,pet_name,source,count,last_seen_at')
    .order('last_seen_at', { ascending: false });
  if (demoError) throw demoError;

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,email,owner_name,user_name,is_owner,created_at')
    .order('created_at', { ascending: false });
  if (profilesError) throw profilesError;

  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('id,user_id,name,type,pet_state,created_at')
    .order('created_at', { ascending: false });
  if (petsError) throw petsError;

  const { data: devices, error: devicesError } = await supabase
    .from('devices')
    .select('id,owner_id,pet_id,device_id,device_type,status,device_state,ip_history,notes,retired_at,created_at')
    .order('created_at', { ascending: false });
  if (devicesError) throw devicesError;

  const deviceStats = {
    rows_with_ip_history: devices.filter((d) => Array.isArray(d.ip_history) && d.ip_history.length > 0).length,
    total_ip_history_entries: devices.reduce(
      (sum, d) => sum + (Array.isArray(d.ip_history) ? d.ip_history.length : 0),
      0
    ),
    retired: devices.filter((d) => d.retired_at).length,
    active: devices.filter((d) => d.status === 'active').length,
  };

  console.log(JSON.stringify({ tables, demo, profiles, pets, devices, deviceStats }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
