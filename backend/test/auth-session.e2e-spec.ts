import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { loginAs, SEED_USERS } from './utils/auth.js';
import { setUserActive } from './utils/db.js';
import { createTestApp } from './utils/test-app.js';

// AGL-34.2: refresh and logout regression (FR-AUTH-01, refresh token rotation).
describe('Auth: refresh and logout (e2e)', () => {
  let app: INestApplication<App>;
  const DEACTIVATED_USER = 'nila@devtrack.local';

  const refresh = (cookie?: string) => {
    const req = request(app.getHttpServer()).post('/auth/refresh');
    return cookie ? req.set('Cookie', cookie) : req;
  };

  // Reads the new refresh cookie from a response, as "refresh_token=...".
  const refreshCookieOf = (res: request.Response) =>
    ([] as string[])
      .concat(res.headers['set-cookie'] ?? [])
      .find((c) => c.startsWith('refresh_token='))
      ?.split(';')[0];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await setUserActive(app, DEACTIVATED_USER, true);
    await app.close();
  });

  it('TC-AGL-06.6-09: refresh with a valid cookie returns 200, a new access token and a new cookie', async () => {
    const { refreshCookie } = await loginAs(app, SEED_USERS.admin);

    const res = await refresh(refreshCookie).expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    const newCookie = refreshCookieOf(res);
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(refreshCookie);
  });

  it('TC-AGL-06.6-10: an old refresh token cannot be used again after a refresh (rotation)', async () => {
    const { refreshCookie } = await loginAs(app, SEED_USERS.manager);
    await refresh(refreshCookie).expect(200);

    await refresh(refreshCookie).expect(401);
  });

  it('TC-AGL-06.6-11: the access token from a refresh works on a protected route', async () => {
    const { refreshCookie } = await loginAs(app, SEED_USERS.member);
    const res = await refresh(refreshCookie).expect(200);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);

    expect(me.body).toMatchObject({ role: 'TEAM_MEMBER' });
  });

  it('TC-AGL-06.6-12: refresh without a cookie returns 401', () => {
    return refresh().expect(401);
  });

  it('TC-AGL-06.6-13: refresh with a made-up cookie returns 401', () => {
    return refresh('refresh_token=not-a-real-token').expect(401);
  });

  it('TC-AGL-06.6-14: logout returns 204, clears the cookie, and the token no longer refreshes', async () => {
    const { refreshCookie } = await loginAs(app, SEED_USERS.admin);

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', refreshCookie)
      .expect(204);

    // Cleared cookie: empty value, expiry in the past.
    const cleared = ([] as string[])
      .concat(res.headers['set-cookie'] ?? [])
      .find((c) => c.startsWith('refresh_token='));
    expect(cleared).toMatch(/^refresh_token=;/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/i);

    await refresh(refreshCookie).expect(401);
  });

  it('TC-AGL-06.6-15: logout without a cookie still returns 204', () => {
    return request(app.getHttpServer()).post('/auth/logout').expect(204);
  });

  it('TC-AGL-06.6-16: a user who is turned off cannot refresh, and the old access token stops working at once', async () => {
    const { accessToken, refreshCookie } = await loginAs(app, DEACTIVATED_USER);
    await setUserActive(app, DEACTIVATED_USER, false);

    // Step 1: refresh is refused.
    await refresh(refreshCookie).expect(401);

    // Step 2: deactivation revokes access at once (NFR-SEC-02, BUG-AGL-06.3-01 fixed).
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
    expect(me.body.code).toBe('UNAUTHENTICATED');

    await setUserActive(app, DEACTIVATED_USER, true);
  });
});

// SRS §5.3: a refused refresh or a refresh after logout is 401 UNAUTHENTICATED.
// BUG-AGL-06.1-02 (open): these 401s have no `code` yet, so the tests are marked
// `it.fails`. When the fix is merged they start passing, Vitest reports them,
// and then `.fails` must be removed.
describe('Auth: refresh and logout 401 body (BUG-AGL-06.1-02)', () => {
  let app: INestApplication<App>;
  const DEACTIVATED_USER = 'nila@devtrack.local';
  const UNAUTHENTICATED = {
    statusCode: 401,
    code: 'UNAUTHENTICATED',
    message: 'Invalid refresh token',
    error: 'Unauthorized',
  };

  const refresh = (cookie?: string) => {
    const req = request(app.getHttpServer()).post('/auth/refresh');
    return cookie ? req.set('Cookie', cookie) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await setUserActive(app, DEACTIVATED_USER, true);
    await app.close();
  });

  it.fails('TC-AGL-06.6-10: old refresh token after rotation', async () => {
    const { refreshCookie } = await loginAs(app, SEED_USERS.manager);
    await refresh(refreshCookie).expect(200);

    const res = await refresh(refreshCookie).expect(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  it.fails('TC-AGL-06.6-12: refresh without a cookie', async () => {
    const res = await refresh().expect(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  it.fails('TC-AGL-06.6-13: refresh with a made-up cookie', async () => {
    const res = await refresh('refresh_token=not-a-real-token').expect(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  it.fails('TC-AGL-06.6-14 (step 2): refresh after logout', async () => {
    const { refreshCookie } = await loginAs(app, SEED_USERS.admin);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', refreshCookie)
      .expect(204);

    const res = await refresh(refreshCookie).expect(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  it.fails(
    'TC-AGL-06.6-16 (step 1): refresh by a deactivated user',
    async () => {
      const { refreshCookie } = await loginAs(app, DEACTIVATED_USER);
      await setUserActive(app, DEACTIVATED_USER, false);

      const res = await refresh(refreshCookie).expect(401);
      expect(res.body).toEqual(UNAUTHENTICATED);
    },
  );
});
