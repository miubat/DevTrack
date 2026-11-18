import { Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;
const LIMIT = 10;

// Login rate limit: 10 requests per minute per IP (NFR-SEC-07).
// In memory, so it resets when the backend restarts.
@Injectable()
export class LoginRateLimiter {
  private readonly hits = new Map<string, number[]>();

  // Returns 0 when the request is allowed, or the seconds to wait when the IP is over the limit.
  check(ip: string, now = Date.now()): number {
    const recent = (this.hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= LIMIT) {
      this.hits.set(ip, recent);
      return Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    }
    recent.push(now);
    this.hits.set(ip, recent);
    this.prune(now);
    return 0;
  }

  private prune(now: number): void {
    if (this.hits.size <= 10_000) {
      return;
    }
    for (const [ip, times] of this.hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) {
        this.hits.delete(ip);
      }
    }
  }
}
