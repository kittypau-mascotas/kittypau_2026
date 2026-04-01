import { createClient } from "@supabase/supabase-js";

function getEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value : null;
}

const analyticsUrl = getEnv("SUPABASE_ANALYTICS_URL");
const analyticsKey = getEnv("SUPABASE_ANALYTICS_SERVICE_KEY");

export const analyticsAvailable = Boolean(analyticsUrl && analyticsKey);

export const supabaseAnalytics = analyticsAvailable
  ? createClient(analyticsUrl!, analyticsKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
