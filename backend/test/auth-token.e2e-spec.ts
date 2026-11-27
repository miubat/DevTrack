import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { loginAs, SEED_PASSWORD, SEED_USERS } from './utils/auth.js';
import { createTestApp } from './utils/test-app.js';

// AGL-34.2: access token regression (NFR-SEC-02, global JwtAuthGuard).
describe('Auth: access token (e2e)', () => {
  let app: INestApplication<App>;
  const jwt = new JwtService();

  const me = (authorization?: string) => {
    const req = request(app.getHttpServer()).get('/auth/me');
    return authorization ? req.set('Authorization', authorization) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('TC-AGL-06.6-17: no token returns 401 UNAUTHENTICATED', async () => {
    const res = await me().expect(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('TC-AGL-06.6-18: a made-up token returns 401', async () => {
    const res = await me('Bearer not.a.token').expect(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('TC-AGL-06.6-19: an expired token returns 401', async () => {
    // Real secret, but it expired one minute ago.
    const expired = await jwt.signAsync(
      { sub: '1', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 },
      { secret: process.env.JWT_ACCESS_SECRET },
    );

    const res = await me(`Bearer ${expired}`).expect(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('TC-AGL-06.6-20: a token signed with a different secret returns 401', async () => {
    const forged = await jwt.signAsync(
      { sub: '1', role: 'ADMIN' },
      { secret: 'someone-else-secret', expiresIn: 300 },
    );

    const res = await me(`Bearer ${forged}`).expect(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('TC-AGL-06.6-21: a real token with the wrong scheme ("Basic") returns 401', async () => {
    const { accessToken } = await loginAs(app, SEED_USERS.admin);

    const res = await me(`Basic ${accessToken}`).expect(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('TC-AGL-06.6-22: a valid token is accepted on /auth/me', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: SEED_USERS.member, password: SEED_PASSWORD })
      .expect(200);

    // SRS silent: only check that a valid token is accepted.
    await me(`Bearer ${login.body.accessToken}`).expect(200);
  });
});
