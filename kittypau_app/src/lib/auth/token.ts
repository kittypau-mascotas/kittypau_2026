import { getSupabaseBrowser } from "@/lib/supabase/browser";

const ACCESS_TOKEN_KEY = "kp_access_token";
const REFRESH_TOKEN_KEY = "kp_refresh_token";
const TOKEN_SKEW_MS = 60_000; // refresh when expiring within 60s

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(params: {
  accessToken: string;
  refreshToken?: string | null;
}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  if (params.refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function decodeJwtExp(accessToken: string): number | null {
  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;
  const payload = parts[1];
  if (!payload) return null;

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  // Pad base64 to valid length
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  try {
    const json = atob(padded);
    const data = JSON.parse(json) as { exp?: number };
    return typeof data.exp === "number" ? data.exp : null;
  } catch {
    return null;
  }
}

function isTokenFreshEnough(accessToken: string) {
  const exp = decodeJwtExp(accessToken);
  if (!exp) return false;
  return exp * 1000 - Date.now() > TOKEN_SKEW_MS;
}

async function refreshWithSupabase(refreshToken: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session?.access_token) return null;

  setTokens({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token ?? refreshToken,
  });

  return data.session.access_token;
}

export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken();
  if (accessToken && isTokenFreshEnough(accessToken)) return accessToken;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  return await refreshWithSupabase(refreshToken);
}

export async function forceRefreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  return await refreshWithSupabase(refreshToken);
}
