import { getD1Binding } from "@/db";

type RateLimitOptions = {
  scope: "support-chat" | "support-contact";
  limit: number;
  windowMs: number;
  userId?: string | null;
};

type MemoryBucket = {
  count: number;
  expiresAt: number;
};

const fallbackBuckets = new Map<string, MemoryBucket>();

export class SupportRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    this.name = "SupportRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function assertSupportRateLimit(
  request: Request,
  options: RateLimitOptions,
) {
  const now = Date.now();
  const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
  const expiresAt = windowStart + options.windowMs;
  const identity = await getIdentityHash(request, options.userId);
  const id = `${options.scope}:${identity}:${windowStart}`;

  try {
    const db = getD1Binding();
    await db
      .prepare(
        `INSERT INTO support_rate_limits (id, count, expires_at)
         VALUES (?1, 1, ?2)
         ON CONFLICT(id) DO UPDATE SET count = count + 1`,
      )
      .bind(id, expiresAt)
      .run();

    const row = await db
      .prepare("SELECT count FROM support_rate_limits WHERE id = ?1 LIMIT 1")
      .bind(id)
      .first<{ count: number }>();

    if (Math.random() < 0.02) {
      void db
        .prepare("DELETE FROM support_rate_limits WHERE expires_at < ?1")
        .bind(now - options.windowMs)
        .run()
        .catch(() => undefined);
    }

    const count = Number(row?.count ?? 0);
    if (count > options.limit) {
      throw new SupportRateLimitError(
        Math.max(1, Math.ceil((expiresAt - now) / 1000)),
      );
    }
    return;
  } catch (error) {
    if (error instanceof SupportRateLimitError) throw error;
    // Local preview or a deployment before the migration is applied: keep a
    // best-effort per-isolate limiter instead of failing the support feature.
  }

  const existing = fallbackBuckets.get(id);
  const bucket = existing && existing.expiresAt > now
    ? existing
    : { count: 0, expiresAt };
  bucket.count += 1;
  fallbackBuckets.set(id, bucket);

  if (fallbackBuckets.size > 500) {
    for (const [key, value] of fallbackBuckets) {
      if (value.expiresAt <= now) fallbackBuckets.delete(key);
    }
  }

  if (bucket.count > options.limit) {
    throw new SupportRateLimitError(
      Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000)),
    );
  }
}

async function getIdentityHash(request: Request, userId?: string | null) {
  const forwarded = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const source = userId ? `user:${userId}` : `ip:${forwarded}`;
  const salt = process.env.SUPPORT_RATE_LIMIT_SALT
    || process.env.AUTH_SESSION_SECRET
    || "buysor-support";
  const bytes = new TextEncoder().encode(`${salt}:${source}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
