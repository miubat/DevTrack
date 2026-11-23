import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { SEED_PASSWORD } from './utils/auth.js';
import { clearFailedLogins } from './utils/db.js';
import { createTestApp } from './utils/test-app.js';

// AGL-34.2: failed-login lockout regression (FR-AUTH-04).
// 5 wrong passwords for one account in 15 minutes lock it: 429 TEMPORARILY_LOCKED.
// Each describe starts its own app, so each gets a fresh login limit (10 per minute).
const WRONG = 'Wrong-password-1';

async function startApp(): Promise<INestApplication<App>> {
  const app = await createTestApp();
  await clearFailedLogins(app); // in case an earlier run stopped half way
  return app;
}

function login(app: INestApplication<App>, email: string, password: string) {
  return request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });
}

describe('Auth: lockout after 5 failed logins (e2e)', () => {
  let app: INestApplication<App>;
  const LOCKED_USER = 'sadia@devtrack.local';
  const OTHER_USER = 'hasan@devtrack.local';

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await clearFailedLogins(app);
    await app.close();
  });

  it('TC-AGL-06.6-26: after 5 wrong passwords, even the right password gets 429 with Retry-After', async () => {
    for (let i = 0; i < 5; i++) {
      await login(app, LOCKED_USER, WRONG).expect(401);
    }

    const res = await login(app, LOCKED_USER, SEED_PASSWORD).expect(429);

    expect(res.body.code).toBe('TEMPORARILY_LOCKED');
    const retryAfter = Number(res.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(15 * 60);
  });

  it('TC-AGL-06.6-27: the lock is per account: another user can still log in', () => {
    return login(app, OTHER_USER, SEED_PASSWORD).expect(200);
  });
});

describe('Auth: a successful login resets the failed count (e2e)', () => {
  let app: INestApplication<App>;
  const USER = 'imran@devtrack.local';

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await clearFailedLogins(app);
    await app.close();
  });

  it('TC-AGL-06.6-28: 4 wrong, 1 right, 4 wrong: the account is not locked', async () => {
    for (let i = 0; i < 4; i++) {
      await login(app, USER, WRONG).expect(401);
    }
    await login(app, USER, SEED_PASSWORD).expect(200);
    for (let i = 0; i < 4; i++) {
      await login(app, USER, WRONG).expect(401);
    }

    // 10th login request of this app: still inside the limit of 10 per minute.
    await login(app, USER, SEED_PASSWORD).expect(200);
  });
});
