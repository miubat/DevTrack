import { describe, expect, it } from 'vitest';
import { LoginRateLimiter } from './login-rate-limiter.js';

describe('LoginRateLimiter', () => {
  it('allows 10 attempts per minute and blocks the 11th', () => {
    const limiter = new LoginRateLimiter();
    for (let i = 0; i < 10; i++) {
      expect(limiter.check('1.1.1.1', 1000 + i)).toBe(0);
    }
    expect(limiter.check('1.1.1.1', 2000)).toBe(59);
  });

  it('allows attempts again after the minute has passed', () => {
    const limiter = new LoginRateLimiter();
    for (let i = 0; i < 10; i++) {
      limiter.check('1.1.1.1', 1000 + i);
    }
    expect(limiter.check('1.1.1.1', 70_000)).toBe(0);
  });

  it('counts each IP separately', () => {
    const limiter = new LoginRateLimiter();
    for (let i = 0; i < 10; i++) {
      limiter.check('1.1.1.1', 1000 + i);
    }
    expect(limiter.check('2.2.2.2', 2000)).toBe(0);
  });
});
