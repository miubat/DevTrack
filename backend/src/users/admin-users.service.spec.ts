import { ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { describe, expect, it, vi } from 'vitest';
import { DatabaseService } from '../database/database.service.js';
import { AdminUsersService } from './admin-users.service.js';

const row = {
  id: '7',
  full_name: 'Rahim Ahmed',
  email: 'rahim@devtrack.local',
  role: 'PROJECT_MANAGER',
  is_active: true,
  must_reset_pw: true,
  created_at: new Date('2026-11-25T00:00:00Z'),
};

function makeService(handler: (sql: string, params: unknown[]) => unknown[]) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const query = vi.fn((sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    try {
      return Promise.resolve(handler(sql, params));
    } catch (e) {
      return Promise.reject(e as Error);
    }
  });
  const service = new AdminUsersService({
    query,
  } as unknown as DatabaseService);
  return { service, calls };
}

describe('AdminUsersService.list', () => {
  it('returns one page of users with the total, without password hashes', async () => {
    const { service, calls } = makeService((sql) =>
      sql.includes('count(*)') ? [{ total: 31 }] : [row],
    );

    const result = await service.list({ page: 2, size: 10 });

    expect(result).toEqual({
      items: [
        {
          id: '7',
          fullName: 'Rahim Ahmed',
          email: 'rahim@devtrack.local',
          role: 'PROJECT_MANAGER',
          isActive: true,
          mustResetPassword: true,
          createdAt: row.created_at,
        },
      ],
      total: 31,
      page: 2,
      size: 10,
    });
    const select = calls.find((c) => c.sql.includes('LIMIT'))!;
    expect(select.sql).not.toContain('password_hash');
    expect(select.sql).not.toContain('WHERE');
    expect(select.params).toEqual([10, 10]);
  });

  it('searches name and email case-insensitively and escapes wildcards', async () => {
    const { service, calls } = makeService((sql) =>
      sql.includes('count(*)') ? [{ total: 0 }] : [],
    );

    await service.list({ q: '  50%_off ', page: 1, size: 25 });

    const select = calls.find((c) => c.sql.includes('LIMIT'))!;
    expect(select.sql).toContain('full_name ILIKE $1 OR email ILIKE $1');
    expect(select.params).toEqual(['%50\\%\\_off%', 25, 0]);
    const count = calls.find((c) => c.sql.includes('count(*)'))!;
    expect(count.params).toEqual(['%50\\%\\_off%']);
  });
});

describe('AdminUsersService.create', () => {
  const dto = {
    fullName: '  Rahim Ahmed ',
    email: 'Rahim@DevTrack.local',
    role: 'PROJECT_MANAGER' as const,
    temporaryPassword: 'Temp1234',
  };

  it('stores a lowercased email, an Argon2id hash and must_reset_pw', async () => {
    const { service, calls } = makeService((sql) =>
      sql.startsWith('INSERT') ? [row] : [],
    );

    const user = await service.create(dto);

    expect(user).toMatchObject({ id: '7', mustResetPassword: true });
    const insert = calls.find((c) => c.sql.startsWith('INSERT'))!;
    expect(insert.sql).toContain('must_reset_pw');
    const [fullName, email, hash, role] = insert.params as string[];
    expect(fullName).toBe('Rahim Ahmed');
    expect(email).toBe('rahim@devtrack.local');
    expect(role).toBe('PROJECT_MANAGER');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await argon2.verify(hash, 'Temp1234')).toBe(true);
  });

  it('refuses an email that exists in any letter case with 409 EMAIL_TAKEN', async () => {
    const { service, calls } = makeService((sql) =>
      sql.includes('lower(email)') ? [{ '?column?': 1 }] : [],
    );

    const error = await service.create(dto).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'EMAIL_TAKEN',
    });
    expect(calls.some((c) => c.sql.startsWith('INSERT'))).toBe(false);
  });

  it('turns a unique-constraint race into 409 EMAIL_TAKEN', async () => {
    const { service } = makeService((sql) => {
      if (sql.startsWith('INSERT')) {
        throw Object.assign(new Error('duplicate key'), { code: '23505' });
      }
      return [];
    });

    const error = await service.create(dto).catch((e: unknown) => e);

    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'EMAIL_TAKEN',
    });
  });
});
