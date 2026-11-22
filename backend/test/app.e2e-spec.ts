import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { loginAs, SEED_USERS } from './utils/auth.js';
import { createTestApp } from './utils/test-app.js';

// Smoke test for the API test framework (AGL-34.1):
// the app starts, talks to the test database, and login works end to end.
describe('API smoke (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / is public and returns 200', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('POST /auth/login with a seed user returns a token and a refresh cookie', async () => {
    const { accessToken, refreshCookie } = await loginAs(app, SEED_USERS.admin);

    expect(accessToken).toEqual(expect.any(String));
    expect(refreshCookie).toMatch(/^refresh_token=.+/);
  });

  it('GET /auth/me works with the access token', async () => {
    const { accessToken } = await loginAs(app, SEED_USERS.member);

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({ role: 'TEAM_MEMBER' });
  });

  it('GET /auth/me without a token returns 401', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
