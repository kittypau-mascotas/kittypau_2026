type Bucket = {
  count: number;
  reset: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
) {
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
