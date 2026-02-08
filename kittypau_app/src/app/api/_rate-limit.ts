type Bucket = {
  count: number;
  reset: number;
};

const buckets = new Map<string, Bucket>();

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

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const count = await upstashCommand<number>("INCR", [key]);
      if (count === 1) {
        await upstashCommand("PEXPIRE", [key, windowMs]);
      }
      if (count > limit) {
        const ttl = await upstashCommand<number>("PTTL", [key]);
        const retryAfter = Math.max(0, Math.ceil(ttl / 1000));
        return { ok: false, retryAfter };
      }
      return { ok: true, retryAfter: 0 };
    } catch {
      // fall back to in-memory limiter
    }
  }

  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now > existing.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfter = Math.ceil((existing.reset - now) / 1000);
    return { ok: false, retryAfter };
  }

  return { ok: true, retryAfter: 0 };
}

export function getRateKeyFromRequest(req: Request, userId?: string) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return userId ? `user:${userId}` : `ip:${ip}`;
}
