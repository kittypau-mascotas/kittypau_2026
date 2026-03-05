import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // GitHub CI can run `next build` without runtime secrets loaded.
    if (process.env.CI === "true") {
      if (name.includes("URL")) return "https://example.supabase.co";
      return "ci-placeholder-key";
    }
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

const supabaseUrl = requireEnv("SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
