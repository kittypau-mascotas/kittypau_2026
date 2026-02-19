const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstashCommand<T = unknown>(
  command: string,
  args: (string | number)[] = []
): Promise<T> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error("UPSTASH_MISSING");
  }
  const body = JSON.stringify([command, ...args]);
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body,
  });
  if (!res.ok) {
    throw new Error("UPSTASH_ERROR");
  }
  const json = (await res.json()) as { result?: T };
  return json.result as T;
}

export async function getCacheJson<T = unknown>(key: string): Promise<T | null> {
  try {
    const raw = await upstashCommand<string | null>("GET", [key]);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCacheJson(
  key: string,
  value: unknown,
  ttlSec: number
): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (ttlSec > 0) {
      await upstashCommand("SETEX", [key, ttlSec, serialized]);
      return;
    }
    await upstashCommand("SET", [key, serialized]);
  } catch {
    // cache write failures must not break APIs
  }
}

const ADMIN_OVERVIEW_VERSION_KEY = "admin:overview:version";

export async function getAdminOverviewCacheVersion(): Promise<number> {
  try {
    const raw = await upstashCommand<string | null>("GET", [
      ADMIN_OVERVIEW_VERSION_KEY,
    ]);
    if (!raw) return 1;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
  } catch {
    return 1;
  }
}

export async function bumpAdminOverviewCacheVersion(): Promise<void> {
  try {
    const next = await upstashCommand<number>("INCR", [ADMIN_OVERVIEW_VERSION_KEY]);
    if (next === 1) {
      await upstashCommand("EXPIRE", [ADMIN_OVERVIEW_VERSION_KEY, 60 * 60 * 24 * 30]);
    }
  } catch {
    // ignore
  }
}

