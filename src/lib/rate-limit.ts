export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

/**
 * Sliding-window rate limiter, in-memory.
 *
 * Suitable for single-instance deployments (one container behind one
 * proxy). If we ever scale to multiple replicas, move this to a shared
 * store (DB/Redis) — the interface can stay the same.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records an attempt for `key` and reports whether it is allowed. */
  check(key: string, now: number = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const times = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (times.length >= this.limit) {
      this.hits.set(key, times);
      return {
        allowed: false,
        retryAfterMs: Math.max(times[0] + this.windowMs - now, 0),
      };
    }

    times.push(now);
    if (times.length === 1) this.prune(cutoff);
    this.hits.set(key, times);
    return { allowed: true, retryAfterMs: 0 };
  }

  /** Drops expired keys once the map grows large (bounded memory). */
  private prune(cutoff: number): void {
    if (this.hits.size < 10_000) return;
    for (const [key, times] of this.hits) {
      if (times.every((t) => t <= cutoff)) this.hits.delete(key);
    }
  }
}

/** Client IP as reported by the reverse proxy (first hop). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
