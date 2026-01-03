// src/utils/rateLimiter.ts

/**
 * Rate Limiter with exponential backoff
 * Prevents API rate limit errors by queuing requests
 */

interface RateLimiterConfig {
  requestsPerMinute: number;
  maxRetries: number;
  initialRetryDelay: number; // ms
}

interface QueuedRequest {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  retries: number;
}

export class RateLimiter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private requestTimes: number[] = [];
  private config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      requestsPerMinute: config.requestsPerMinute || 50,
      maxRetries: config.maxRetries || 3,
      initialRetryDelay: config.initialRetryDelay || 1000,
    };
  }

  /**
   * Add request to queue
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        retries: 0
      });
      this.processQueue();
    });
  }

  /**
   * Process queued requests with rate limiting
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Check if we can make a request
      if (!this.canMakeRequest()) {
        const waitTime = this.getWaitTime();
        await this.sleep(waitTime);
        continue;
      }

      const request = this.queue.shift();
      if (!request) break;

      try {
        // Execute request
        const result = await request.fn();
        this.recordRequest();
        request.resolve(result);
      } catch (error) {
        // Handle rate limit errors (429)
        if (this.isRateLimitError(error) && request.retries < this.config.maxRetries) {
          // Exponential backoff
          const delay = this.config.initialRetryDelay * Math.pow(2, request.retries);
          console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${request.retries + 1}/${this.config.maxRetries})`);
          
          await this.sleep(delay);
          
          // Re-queue with incremented retry count
          this.queue.unshift({ ...request, retries: request.retries + 1 });
        } else {
          // Max retries reached or other error
          request.reject(error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Check if we can make a request based on rate limit
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);

    return this.requestTimes.length < this.config.requestsPerMinute;
  }

  /**
   * Calculate how long to wait before next request
   */
  private getWaitTime(): number {
    if (this.requestTimes.length === 0) return 0;

    const oldestRequest = Math.min(...this.requestTimes);
    const timeSinceOldest = Date.now() - oldestRequest;
    const timeToWait = 60000 - timeSinceOldest;

    return Math.max(timeToWait, 100); // Minimum 100ms
  }

  /**
   * Record a successful request
   */
  private recordRequest() {
    this.requestTimes.push(Date.now());
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    const err = error as { status?: number; code?: string; message?: string } | null | undefined;
    const message = err?.message?.toLowerCase();
    return (
      err?.status === 429 ||
      err?.code === 'rate_limit_exceeded' ||
      (message?.includes('rate limit') ?? false)
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      recentRequests: this.requestTimes.length,
    };
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue.forEach(req => req.reject(new Error('Queue cleared')));
    this.queue = [];
  }
}

// Create singleton instances for different APIs
export const openaiLimiter = new RateLimiter({ requestsPerMinute: 50 });
export const claudeLimiter = new RateLimiter({ requestsPerMinute: 40 });
export const geminiLimiter = new RateLimiter({
  requestsPerMinute: 5,  // OCR throttle (RPM)
  maxRetries: 5,
  initialRetryDelay: 10000  // Vänta 10 sek mellan retries
});
