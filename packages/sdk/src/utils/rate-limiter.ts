export interface RateLimiterOptions {
  requestsPerSecond: number;
}

export class RateLimiter {
  private readonly limit: number;
  private windowCount = 0;
  private windowStart = Date.now();
  private queue: Array<() => void> = [];

  constructor(options: RateLimiterOptions) {
    this.limit = options.requestsPerSecond;
  }

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.flush();
    });
  }

  private flush(): void {
    const now = Date.now();
    if (now - this.windowStart >= 1000) {
      this.windowCount = 0;
      this.windowStart = now;
    }

    while (this.queue.length > 0 && this.windowCount < this.limit) {
      const resolve = this.queue.shift()!;
      this.windowCount++;
      resolve();
    }

    if (this.queue.length > 0) {
      const waitMs = 1000 - (Date.now() - this.windowStart);
      setTimeout(() => {
        this.windowCount = 0;
        this.windowStart = Date.now();
        this.flush();
      }, Math.max(waitMs, 0));
    }
  }
}
