import { forceRefreshAccessToken, getValidAccessToken } from "@/lib/auth/token";

function mergeHeaders(
  base?: HeadersInit,
  extra?: Record<string, string>
): Headers {
  const headers = new Headers(base ?? undefined);
  for (const [key, value] of Object.entries(extra ?? {})) {
    headers.set(key, value);
  }
  return headers;
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = await getValidAccessToken();
  if (!token) {
    return new Response(
      JSON.stringify({
        error: "Necesitas iniciar sesión.",
        code: "AUTH_INVALID",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const res = await fetch(input, {
    ...init,
    headers: mergeHeaders(init?.headers, { Authorization: `Bearer ${token}` }),
  });

  if (res.status !== 401) return res;

  const refreshed = await forceRefreshAccessToken();
  if (!refreshed) return res;

  return await fetch(input, {
    ...init,
    headers: mergeHeaders(init?.headers, {
      Authorization: `Bearer ${refreshed}`,
      "x-kp-retry": "1",
    }),
  });
}

