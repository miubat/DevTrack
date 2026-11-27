import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { loginAs, SEED_USERS } from './utils/auth.js';
import { createTestApp } from './utils/test-app.js';

// AGL-34.2: role guard regression (SRS §1.3, RolesGuard from AGL-06.5).
// Uses the temporary /access-check routes. Update this file when they are removed.
type UserKey = keyof typeof SEED_USERS;

// Who may open which route: 200 = allowed, 403 = wrong role.
// The first column is the AGL-06.6 test case number.
const MATRIX: Array<
  [tc: string, route: string, user: UserKey, status: 200 | 403]
> = [
  ['23', '/access-check/any', 'admin', 200],
  ['23', '/access-check/any', 'manager', 200],
  ['23', '/access-check/any', 'member', 200],
  ['24', '/access-check/manager', 'admin', 200],
  ['24', '/access-check/manager', 'manager', 200],
  ['24', '/access-check/manager', 'member', 403],
  ['25', '/access-check/admin', 'admin', 200],
  ['25', '/access-check/admin', 'manager', 403],
  ['25', '/access-check/admin', 'member', 403],
];

describe('Auth: roles (e2e)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<UserKey, string>;

  beforeAll(async () => {
    app = await createTestApp();
    // One login per user (3 of the 10 allowed per minute).
    for (const user of Object.keys(SEED_USERS) as UserKey[]) {
      tokens[user] = (await loginAs(app, SEED_USERS[user])).accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(MATRIX)(
    'TC-AGL-06.6-%s: GET %s as %s returns %i',
    async (_tc, route, user, status) => {
      const res = await request(app.getHttpServer())
        .get(route)
        .set('Authorization', `Bearer ${tokens[user]}`)
        .expect(status);

      if (status === 403) {
        expect(res.body.code).toBe('FORBIDDEN_ROLE');
      }
    },
  );
});
