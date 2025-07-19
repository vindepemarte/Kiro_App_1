// IP-based rate limiting service for anonymous users

interface IPUsage {
  ip: string;
  count: number;
  firstAccess: Date;
  lastAccess: Date;
}

interface IPLimiterConfig {
  maxRequestsPerIP: number;
  timeWindowHours: number;
  maxAnonymousUsers: number;
}

export class IPLimiterService {
  private ipUsageMap: Map<string, IPUsage> = new Map();
  private config: IPLimiterConfig;

  constructor(config: Partial<IPLimiterConfig> = {}) {
    this.config = {
      maxRequestsPerIP: config.maxRequestsPerIP || 10, // Max 10 meetings per IP per day
      timeWindowHours: config.timeWindowHours || 24, // 24 hour window
      maxAnonymousUsers: config.maxAnonymousUsers || 100, // Max 100 anonymous users total
    };

    // Clean up old entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  // Get client IP address from request headers
  getClientIP(request: Request): string {
    // Try various headers that might contain the real IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwardedFor.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (cfConnectingIP) {
      return cfConnectingIP;
    }
    
    // Fallback - this won't work in production but useful for development
    return 'unknown';
  }

  // Check if IP is within limits
  checkIPLimit(ip: string): { allowed: boolean; reason?: string; remainingRequests?: number } {
    const now = new Date();
    const usage = this.ipUsageMap.get(ip);

    // Check total anonymous users limit
    if (this.ipUsageMap.size >= this.config.maxAnonymousUsers && !usage) {
      return {
        allowed: false,
        reason: 'Maximum number of anonymous users reached. Please try again later or create an account.',
      };
    }

    if (!usage) {
      // First time access for this IP
      return {
        allowed: true,
        remainingRequests: this.config.maxRequestsPerIP - 1,
      };
    }

    // Check if the time window has expired
    const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000;
    const timeSinceFirstAccess = now.getTime() - usage.firstAccess.getTime();

    if (timeSinceFirstAccess > timeWindowMs) {
      // Time window expired, reset the counter
      return {
        allowed: true,
        remainingRequests: this.config.maxRequestsPerIP - 1,
      };
    }

    // Check if within rate limit
    if (usage.count >= this.config.maxRequestsPerIP) {
      const resetTime = new Date(usage.firstAccess.getTime() + timeWindowMs);
      return {
        allowed: false,
        reason: `Rate limit exceeded. You can process ${this.config.maxRequestsPerIP} meetings per ${this.config.timeWindowHours} hours. Limit resets at ${resetTime.toLocaleString()}.`,
      };
    }

    return {
      allowed: true,
      remainingRequests: this.config.maxRequestsPerIP - usage.count - 1,
    };
  }

  // Record IP usage
  recordIPUsage(ip: string): void {
    const now = new Date();
    const usage = this.ipUsageMap.get(ip);

    if (!usage) {
      // First access
      this.ipUsageMap.set(ip, {
        ip,
        count: 1,
        firstAccess: now,
        lastAccess: now,
      });
    } else {
      // Check if time window has expired
      const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000;
      const timeSinceFirstAccess = now.getTime() - usage.firstAccess.getTime();

      if (timeSinceFirstAccess > timeWindowMs) {
        // Reset the counter for new time window
        usage.count = 1;
        usage.firstAccess = now;
      } else {
        // Increment counter
        usage.count++;
      }
      
      usage.lastAccess = now;
    }
  }

  // Get usage stats for an IP
  getIPUsage(ip: string): { count: number; remainingRequests: number; resetTime?: Date } | null {
    const usage = this.ipUsageMap.get(ip);
    if (!usage) {
      return {
        count: 0,
        remainingRequests: this.config.maxRequestsPerIP,
      };
    }

    const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000;
    const timeSinceFirstAccess = Date.now() - usage.firstAccess.getTime();

    if (timeSinceFirstAccess > timeWindowMs) {
      // Time window expired
      return {
        count: 0,
        remainingRequests: this.config.maxRequestsPerIP,
      };
    }

    return {
      count: usage.count,
      remainingRequests: Math.max(0, this.config.maxRequestsPerIP - usage.count),
      resetTime: new Date(usage.firstAccess.getTime() + timeWindowMs),
    };
  }

  // Clean up old entries
  private cleanup(): void {
    const now = Date.now();
    const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000;

    for (const [ip, usage] of this.ipUsageMap.entries()) {
      const timeSinceLastAccess = now - usage.lastAccess.getTime();
      
      // Remove entries that haven't been accessed for 2x the time window
      if (timeSinceLastAccess > timeWindowMs * 2) {
        this.ipUsageMap.delete(ip);
      }
    }
  }

  // Get current stats
  getStats(): {
    totalIPs: number;
    activeIPs: number;
    config: IPLimiterConfig;
  } {
    const now = Date.now();
    const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000;
    
    let activeIPs = 0;
    for (const usage of this.ipUsageMap.values()) {
      const timeSinceFirstAccess = now - usage.firstAccess.getTime();
      if (timeSinceFirstAccess <= timeWindowMs) {
        activeIPs++;
      }
    }

    return {
      totalIPs: this.ipUsageMap.size,
      activeIPs,
      config: this.config,
    };
  }
}

// Create singleton instance
export const ipLimiter = new IPLimiterService({
  maxRequestsPerIP: 5, // 5 meetings per IP per day for anonymous users
  timeWindowHours: 24,
  maxAnonymousUsers: 50, // Max 50 anonymous users at once
});

// Middleware function for Next.js API routes
export function withIPLimit(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const ip = ipLimiter.getClientIP(req);
    const limitCheck = ipLimiter.checkIPLimit(ip);

    if (!limitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: limitCheck.reason,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': ipLimiter.getStats().config.maxRequestsPerIP.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Record the usage
    ipLimiter.recordIPUsage(ip);

    // Add rate limit headers to response
    const response = await handler(req);
    const usage = ipLimiter.getIPUsage(ip);
    
    if (usage) {
      response.headers.set('X-RateLimit-Limit', ipLimiter.getStats().config.maxRequestsPerIP.toString());
      response.headers.set('X-RateLimit-Remaining', usage.remainingRequests.toString());
      if (usage.resetTime) {
        response.headers.set('X-RateLimit-Reset', Math.floor(usage.resetTime.getTime() / 1000).toString());
      }
    }

    return response;
  };
}