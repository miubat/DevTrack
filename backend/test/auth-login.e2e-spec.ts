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

  // SRS §5.3: a failed login is 401 INVALID_CREDENTIALS (BUG-AGL-06.1-01, fixed).
  const INVALID_CREDENTIALS = {
    statusCode: 401,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    error: 'Unauthorized',
  };

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

    // FR-AUTH-01, NFR-SEC-02: access token 15 minutes, refresh cookie 7 days.
    const payload = JSON.parse(
      Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString(),
    ) as { iat: number; exp: number };
    expect(payload.exp - payload.iat).toBe(15 * 60);
    const expires = Date.parse(/Expires=([^;]+)/i.exec(cookie!)![1]);
    const sentAt = Date.parse(res.headers['date']);
    expect(expires - sentAt).toBe(7 * 24 * 60 * 60 * 1000);
  });

  // SRS silent: only check that the login works.
  it('TC-AGL-06.6-02: email is not case-sensitive', () => {
    return login({
      email: SEED_USERS.admin.toUpperCase(),
      password: SEED_PASSWORD,
    }).expect(200);
  });

  it('TC-AGL-06.6-03: wrong password returns 401 with a generic message', async () => {
    const res = await login({
      email: SEED_USERS.member,
      password: 'Wrong-password-1',
    }).expect(401);

    expect(res.body).toEqual(INVALID_CREDENTIALS); // whole body, no token
  });

  it('TC-AGL-06.6-04: unknown email returns the same 401 message (no account guessing)', async () => {
    const res = await login({
      email: 'nobody@devtrack.local',
      password: SEED_PASSWORD,
    }).expect(401);

    expect(res.body).toEqual(INVALID_CREDENTIALS); // same body as case 03
  });

  // SRS §5.3: bad input is 400 VALIDATION_FAILED (BUG-AGL-06.1-01, fixed).
  it('TC-AGL-06.6-05: a bad email format returns 400 VALIDATION_FAILED', async () => {
    const res = await login({
      email: 'not-an-email',
      password: SEED_PASSWORD,
    }).expect(400);

    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('TC-AGL-06.6-06: an empty password returns 400 VALIDATION_FAILED', async () => {
    const res = await login({ email: SEED_USERS.admin, password: '' }).expect(
      400,
    );

    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('TC-AGL-06.6-07: an empty body returns 400 VALIDATION_FAILED', async () => {
    const res = await login({}).expect(400);

    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('TC-AGL-06.6-08: an inactive user cannot log in (401)', async () => {
    await setUserActive(app, INACTIVE_USER, false);

    const res = await login({
      email: INACTIVE_USER,
      password: SEED_PASSWORD,
    }).expect(401);

    expect(res.body).toEqual(INVALID_CREDENTIALS);
  });
});
