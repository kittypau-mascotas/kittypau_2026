const ACCESS_TOKEN_KEY = "kp_access_token";
const REFRESH_TOKEN_KEY = "kp_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
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
