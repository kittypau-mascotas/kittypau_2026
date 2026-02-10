import { getSupabaseBrowser } from "@/lib/supabase/browser";

const ACCESS_TOKEN_KEY = "kp_access_token";
const REFRESH_TOKEN_KEY = "kp_refresh_token";

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

export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken();
  if (accessToken) return accessToken;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
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
