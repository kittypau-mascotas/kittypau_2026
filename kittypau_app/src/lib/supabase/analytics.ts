import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.CI === "true") {
      if (name.includes("URL")) return "https://example.supabase.co";
      return "ci-placeholder-key";
    }
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

const analyticsUrl = requireEnv("SUPABASE_ANALYTICS_URL");
const analyticsKey = requireEnv("SUPABASE_ANALYTICS_SERVICE_KEY");

export const supabaseAnalytics = createClient(analyticsUrl, analyticsKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
