import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { SEED_PASSWORD, SEED_USERS } from './utils/auth.js';
import { createTestApp } from './utils/test-app.js';

// AGL-34.2: login rate limit regression (NFR-SEC-07).
// 10 login requests per minute per IP; the 11th gets 429 RATE_LIMITED.
// The limit is kept in memory, so a new app starts at zero.
describe('Auth: login rate limit (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('the 11th login request in a minute gets 429 with Retry-After, even with the right password', async () => {
    // 10 quick requests. A bad email format is rejected with 400,
    // but it still counts, and it does not add failed logins to the database.
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'x' })
        .expect(400);
    }

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: SEED_USERS.admin, password: SEED_PASSWORD })
      .expect(429);

    expect(res.body.code).toBe('RATE_LIMITED');
    const retryAfter = Number(res.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });
});
