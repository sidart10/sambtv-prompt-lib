// Simple in-memory rate limiter for evaluation endpoints
// In production, consider using Redis or a similar solution

interface RateLimitOptions {
  requests: number;
  window: string; // e.g., '1m', '1h', '1d'
}

interface RateLimitResult {
  success: boolean;
  reset?: Date;
  remaining?: number;
}

class InMemoryRateLimiter {
  private requests = new Map<string, { count: number; resetAt: Date }>();

  async limit(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowMs = this.parseWindow(options.window);
    const resetAt = new Date(now.getTime() + windowMs);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    const existing = this.requests.get(identifier);

    if (!existing || existing.resetAt < now) {
      // New window
      this.requests.set(identifier, {
        count: 1,
        resetAt
      });

      return {
        success: true,
        remaining: options.requests - 1
      };
    }

    // Check if limit exceeded
    if (existing.count >= options.requests) {
      return {
        success: false,
        reset: existing.resetAt,
        remaining: 0
      };
    }

    // Increment count
    existing.count++;
    return {
      success: true,
      remaining: options.requests - existing.count
    };
  }

  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid window format: ${window}`);
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's':
        return num * 1000;
      case 'm':
        return num * 60 * 1000;
      case 'h':
        return num * 60 * 60 * 1000;
      case 'd':
        return num * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  private cleanup() {
    const now = new Date();
    for (const [key, value] of this.requests.entries()) {
      if (value.resetAt < now) {
        this.requests.delete(key);
      }
    }
  }
}

export const rateLimiter = new InMemoryRateLimiter();