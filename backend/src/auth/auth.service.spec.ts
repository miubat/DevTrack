import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DatabaseService } from '../database/database.service.js';
import { AuthService, LoginLockedError } from './auth.service.js';

let activeUser: Record<string, unknown>;

function makeService(opts: {
  user?: Record<string, unknown>;
  failures?: number;
  wait?: number | null;
}) {
  const sqls: string[] = [];
  const query = vi.fn((sql: string) => {
    sqls.push(sql);
    if (sql.includes('FROM failed_logins') && sql.includes('count(*)')) {
      return Promise.resolve([
        { n: opts.failures ?? 0, wait: opts.wait ?? null },
      ]);
    }
    if (sql.includes('FROM users')) {
      return Promise.resolve(opts.user ? [opts.user] : []);
    }
    return Promise.resolve([]);
  });
  const service = new AuthService({ query } as unknown as DatabaseService);
  return { service, sqls };
}

describe('AuthService.login', () => {
  beforeAll(async () => {
    const hash = await argon2.hash('Passw0rd1', { type: argon2.argon2id });
    activeUser = {
      id: '1',
      full_name: 'Admin User',
      email: 'admin@devtrack.local',
      password_hash: hash,
      role: 'ADMIN',
      is_active: true,
      must_reset_pw: false,
    };
  });

  it('returns the user without the password hash and clears the failed-login counter', async () => {
    const { service, sqls } = makeService({ user: activeUser });
    const result = await service.login('admin@devtrack.local', 'Passw0rd1');
    expect(result).toEqual({
      id: '1',
      fullName: 'Admin User',
      email: 'admin@devtrack.local',
      role: 'ADMIN',
      mustResetPassword: false,
    });
    expect(JSON.stringify(result)).not.toContain('argon2');
    expect(
      sqls.some((s) => s.includes('DELETE FROM failed_logins WHERE email')),
    ).toBe(true);
  });

  it('rejects a wrong password with a generic 401 and records the failure', async () => {
    const { service, sqls } = makeService({ user: activeUser });
    await expect(
      service.login('admin@devtrack.local', 'wrong'),
    ).rejects.toThrow(
      new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        error: 'Unauthorized',
      }),
    );
    expect(sqls.some((s) => s.includes('INSERT INTO failed_logins'))).toBe(
      true,
    );
  });

  it('rejects an unknown email with the same generic 401 and records the failure', async () => {
    const { service, sqls } = makeService({});
    await expect(
      service.login('nobody@devtrack.local', 'Passw0rd1'),
    ).rejects.toThrow(
      new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        error: 'Unauthorized',
      }),
    );
    expect(sqls.some((s) => s.includes('INSERT INTO failed_logins'))).toBe(
      true,
    );
  });

  it('rejects an inactive user with the same generic 401', async () => {
    const { service } = makeService({
      user: { ...activeUser, is_active: false },
    });
    await expect(
      service.login('admin@devtrack.local', 'Passw0rd1'),
    ).rejects.toThrow(
      new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        error: 'Unauthorized',
      }),
    );
  });

  it('still allows the 5th try when there are only 4 failures', async () => {
    const { service } = makeService({ user: activeUser, failures: 4 });
    await expect(
      service.login('admin@devtrack.local', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('locks the account after 5 failures, even with the right password', async () => {
    const { service, sqls } = makeService({
      user: activeUser,
      failures: 5,
      wait: 120,
    });
    const error = await service
      .login('admin@devtrack.local', 'Passw0rd1')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LoginLockedError);
    expect((error as LoginLockedError).retryAfterSeconds).toBe(120);
    expect(sqls.some((s) => s.includes('FROM users'))).toBe(false);
    expect(sqls.some((s) => s.includes('INSERT INTO failed_logins'))).toBe(
      false,
    );
  });
});
