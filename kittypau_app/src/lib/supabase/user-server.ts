import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // GitHub CI can run `next build` without runtime secrets loaded.
    if (process.env.CI === "true") {
      return `ci-placeholder-${name.toLowerCase()}`;
    }
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

const supabaseUrl = requireEnv("SUPABASE_URL");
const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");

export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
