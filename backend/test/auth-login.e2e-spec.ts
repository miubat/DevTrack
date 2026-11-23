import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { SEED_PASSWORD, SEED_USERS } from './utils/auth.js';
import { clearFailedLogins, setUserActive } from './utils/db.js';
import { createTestApp } from './utils/test-app.js';

// AGL-34.2: login regression (FR-AUTH-01).
// Keep this file under 10 login requests: the login limit is 10 per minute per IP.
describe('Auth: login (e2e)', () => {
  let app: INestApplication<App>;
  const INACTIVE_USER = 'tania@devtrack.local';

  const login = (body: object) =>
    request(app.getHttpServer()).post('/auth/login').send(body);

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await setUserActive(app, INACTIVE_USER, true);
    await clearFailedLogins(app);
    await app.close();
  });

  it('TC-AGL-06.6-01: valid login returns 200, the user, an access token and a safe refresh cookie', async () => {
    const res = await login({
      email: SEED_USERS.admin,
      password: SEED_PASSWORD,
    }).expect(200);

    expect(res.body.user).toMatchObject({
      email: SEED_USERS.admin,
      role: 'ADMIN',
      mustResetPassword: false,
    });
    expect(res.body.accessToken).toEqual(expect.any(String));
    // The password hash must never leave the server.
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash|argon2/i);

    const cookie = ([] as string[])
      .concat(res.headers['set-cookie'] ?? [])
      .find((c) => c.startsWith('refresh_token='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/auth/i);
  });

  it('TC-AGL-06.6-02: email is not case-sensitive', async () => {
    const res = await login({
      email: SEED_USERS.manager.toUpperCase(),
      password: SEED_PASSWORD,
    }).expect(200);

    expect(res.body.user.role).toBe('PROJECT_MANAGER');
  });

  it('TC-AGL-06.6-03: wrong password returns 401 with a generic message', async () => {
    const res = await login({
      email: SEED_USERS.member,
      password: 'Wrong-password-1',
    }).expect(401);

    expect(res.body.message).toBe('Invalid email or password');
    expect(res.body.accessToken).toBeUndefined();
  });

  it('TC-AGL-06.6-04: unknown email returns the same 401 message (no account guessing)', async () => {
    const res = await login({
      email: 'nobody@devtrack.local',
      password: SEED_PASSWORD,
    }).expect(401);

    expect(res.body.message).toBe('Invalid email or password');
  });

  it('TC-AGL-06.6-05: a bad email format returns 400', () => {
    return login({ email: 'not-an-email', password: SEED_PASSWORD }).expect(
      400,
    );
  });

  it('TC-AGL-06.6-06: an empty password returns 400', () => {
    return login({ email: SEED_USERS.admin, password: '' }).expect(400);
  });

  it('TC-AGL-06.6-07: an empty body returns 400', () => {
    return login({}).expect(400);
  });

  it('TC-AGL-06.6-08: an inactive user cannot log in (401)', async () => {
    await setUserActive(app, INACTIVE_USER, false);

    const res = await login({
      email: INACTIVE_USER,
      password: SEED_PASSWORD,
    }).expect(401);

    expect(res.body.message).toBe('Invalid email or password');
  });
});
