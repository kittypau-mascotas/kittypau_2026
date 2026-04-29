import { createClient } from "@supabase/supabase-js";

let cachedClient: ReturnType<typeof createClient> | null = null;

const KP_REFRESH_TOKEN_KEY = "kp_refresh_token";
const KP_ACCESS_TOKEN_KEY = "kp_access_token";

function clearAllAuthStorage() {
  if (typeof window === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith("sb-") ||
      key === KP_ACCESS_TOKEN_KEY ||
      key === KP_REFRESH_TOKEN_KEY
    ) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) window.localStorage.removeItem(key);
}

function preemptiveClearStaleSession() {
  if (typeof window === "undefined") return;
  const hasKpToken = Boolean(
    window.localStorage.getItem(KP_REFRESH_TOKEN_KEY),
  );
  if (hasKpToken) return;
  // Sin token KP no hay sesión válida — limpiar sb-* para evitar el
  // "Invalid Refresh Token" del autoRefresh interno de Supabase.
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith("sb-")) toRemove.push(key);
  }
  for (const key of toRemove) window.localStorage.removeItem(key);
}

export function getSupabaseBrowser() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  preemptiveClearStaleSession();

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  cachedClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") clearAllAuthStorage();
  });

  return cachedClient;
}
