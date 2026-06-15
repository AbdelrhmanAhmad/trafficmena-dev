type RateLimitRule = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  expiresAt: number;
};

/**
 * In-memory rate limiter for request throttling.
 *
 * IMPORTANT: SINGLE-INSTANCE LIMITATION
 * =====================================
 * This rate limiter stores state in local memory and is NOT shared across
 * server instances. Before horizontal scaling:
 *
 * 1. Migrate to Redis-backed rate limiting (e.g., rate-limiter-flexible)
 * 2. Or use a load balancer with sticky sessions
 *
 * Current behavior with multiple instances:
 * - Rate limit: 5 requests/minute per user
 * - With 3 instances: Effective limit becomes 15 requests/minute
 *
 * For MVP with single instance, this implementation is acceptable.
 */
export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs = 5 * 60 * 1000) {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.buckets.entries()) {
        if (bucket.expiresAt <= now) {
          this.buckets.delete(key);
        }
      }
    }, cleanupIntervalMs);
    this.cleanupInterval.unref?.();
  }

  consume(key: string, rule: RateLimitRule) {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      const expiresAt = now + rule.windowMs;
      this.buckets.set(key, { count: 1, expiresAt });
      return {
        allowed: true,
        remaining: rule.limit - 1,
        resetAt: expiresAt,
      };
    }

    if (bucket.count >= rule.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.expiresAt,
      };
    }

    bucket.count += 1;
    return {
      allowed: true,
      remaining: rule.limit - bucket.count,
      resetAt: bucket.expiresAt,
    };
  }

  reset(key: string) {
    this.buckets.delete(key);
  }

  /**
   * Get the current count for a key without consuming.
   * Returns 0 if the key doesn't exist or has expired.
   */
  getCount(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.expiresAt <= Date.now()) {
      return 0;
    }
    return bucket.count;
  }

  dispose() {
    clearInterval(this.cleanupInterval);
  }
}

export const otpRateLimiter = new InMemoryRateLimiter();
export const invitationRateLimiter = new InMemoryRateLimiter();
export const otpVerificationRateLimiter = new InMemoryRateLimiter();
// Payment-specific rate limiter instance
// See class documentation for scaling limitations
export const paymentRateLimiter = new InMemoryRateLimiter();
