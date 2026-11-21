import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';

// Seed users (db/prisma/seed-data.ts). All share the seed password.
export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd1';

export const SEED_USERS = {
  admin: 'admin@devtrack.local', // ADMIN
  manager: 'rahim@devtrack.local', // PROJECT_MANAGER
  member: 'karim@devtrack.local', // TEAM_MEMBER
} as const;

export interface LoginResult {
  accessToken: string;
  // The Set-Cookie header with the refresh token, ready to send back.
  refreshCookie: string;
}

// Logs in and returns the access token and the refresh cookie.
// Fails the test if login does not return 200.
export async function loginAs(
  app: INestApplication<App>,
  email: string,
  password: string = SEED_PASSWORD,
): Promise<LoginResult> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
  if (!refreshCookie) {
    throw new Error('Login did not set the refresh_token cookie.');
  }

  return {
    accessToken: (res.body as { accessToken: string }).accessToken,
    refreshCookie: refreshCookie.split(';')[0],
  };
}
