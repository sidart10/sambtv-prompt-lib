interface RateLimitConfig {
  interval: number;
  uniqueTokenPerInterval: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(private config: RateLimitConfig) {}
  
  check(identifier: string): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.config.interval;
    
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.config.uniqueTokenPerInterval) {
      return { 
        success: false, 
        remaining: 0,
        resetTime: now + this.config.interval
      };
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return { 
      success: true, 
      remaining: this.config.uniqueTokenPerInterval - validRequests.length,
      resetTime: now + this.config.interval
    };
  }
  
  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > now - this.config.interval);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Export rate limiter instances
export const streamingLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10, // 10 requests per minute for streaming
});

export const generalLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 30, // 30 requests per minute for general API
});

// Clean up every 5 minutes
setInterval(() => {
  streamingLimiter.cleanup();
  generalLimiter.cleanup();
}, 5 * 60 * 1000);