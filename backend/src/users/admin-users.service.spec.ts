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

describe('AdminUsersService.update', () => {
  const admin = { id: '1', role: 'ADMIN' };
  // The UPDATE returns the row after the change plus old_role (the role before it).
  const updated = (sql: string) =>
    sql.startsWith('UPDATE users') ? [{ ...row, old_role: row.role }] : [];
  const roleChangedFrom = (oldRole: string) => (sql: string) =>
    sql.startsWith('UPDATE users') ? [{ ...row, old_role: oldRole }] : [];

  async function errorOf(p: Promise<unknown>) {
    const e = await p.catch((err: unknown) => err);
    return (e as { getResponse(): unknown }).getResponse();
  }

  it('changes only the fields that are sent and trims the name', async () => {
    const { service, calls } = makeService(updated);

    const user = await service.update('7', { fullName: '  Rahim A ' }, admin);

    expect(user).toMatchObject({ id: '7' });
    const update = calls.find((c) => c.sql.startsWith('UPDATE users'))!;
    expect(update.sql).toContain('COALESCE');
    expect(update.params).toEqual(['7', 'Rahim A', null, null]);
    expect(calls.some((c) => c.sql.includes('refresh_tokens'))).toBe(false);
  });

  it('revokes all refresh tokens when the user is deactivated (NFR-SEC-02)', async () => {
    const { service, calls } = makeService(updated);

    await service.update('7', { isActive: false }, admin);

    const revoke = calls.find((c) => c.sql.includes('refresh_tokens'))!;
    expect(revoke.sql).toContain('revoked_at = now()');
    expect(revoke.params).toEqual(['7']);
    // The user is updated first, so a refresh at the same moment already sees is_active = false.
    expect(
      calls.findIndex((c) => c.sql.startsWith('UPDATE users')),
    ).toBeLessThan(calls.indexOf(revoke));
  });

  it('revokes all refresh tokens when the role really changes, so the user logs in again', async () => {
    const { service, calls } = makeService(roleChangedFrom('TEAM_MEMBER'));

    await service.update('7', { role: 'PROJECT_MANAGER' }, admin);

    const revoke = calls.find((c) => c.sql.includes('refresh_tokens'))!;
    expect(revoke.params).toEqual(['7']);
  });

  it('locks the row while reading the old role, so two admins at once cannot hide a role change', async () => {
    const { service, calls } = makeService(updated);

    await service.update('7', { role: 'PROJECT_MANAGER' }, admin);

    const update = calls.find((c) => c.sql.startsWith('UPDATE users'))!;
    expect(update.sql).toMatch(
      /\(SELECT id, role FROM users WHERE id = \$1 FOR UPDATE\) old/,
    );
  });

  it('does not revoke sessions on reactivation or when the same role is sent', async () => {
    const { service, calls } = makeService(updated);

    await service.update(
      '7',
      { isActive: true, role: 'PROJECT_MANAGER', fullName: 'Rahim' },
      admin,
    );

    expect(calls.some((c) => c.sql.includes('refresh_tokens'))).toBe(false);
  });

  it('refuses an empty change with 400 VALIDATION_FAILED', async () => {
    const { service, calls } = makeService(updated);

    expect(await errorOf(service.update('7', {}, admin))).toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    expect(calls).toEqual([]);
  });

  it.each(['abc', '0', '01', '-1', '1.5', '9'.repeat(19)])(
    'answers 404 NOT_FOUND for id "%s" without a query',
    async (id) => {
      const { service, calls } = makeService(updated);

      expect(
        await errorOf(service.update(id, { isActive: true }, admin)),
      ).toMatchObject({ code: 'NOT_FOUND' });
      expect(calls).toEqual([]);
    },
  );

  it('answers 404 NOT_FOUND when no user has the id', async () => {
    const { service } = makeService(() => []);

    expect(
      await errorOf(service.update('999', { isActive: false }, admin)),
    ).toMatchObject({ code: 'NOT_FOUND' });
  });

  it.each([
    ['deactivate', { isActive: false }],
    ['change the role of', { role: 'TEAM_MEMBER' as const }],
  ])('refuses to %s yourself with 422 CANNOT_CHANGE_SELF', async (_, dto) => {
    const { service, calls } = makeService(updated);

    expect(await errorOf(service.update('1', dto, admin))).toMatchObject({
      code: 'CANNOT_CHANGE_SELF',
    });
    expect(calls).toEqual([]);
  });

  it('lets an admin change their own name, or send their own unchanged role', async () => {
    const { service } = makeService(updated);

    await expect(
      service.update(
        '1',
        { fullName: 'Admin', role: 'ADMIN', isActive: true },
        admin,
      ),
    ).resolves.toMatchObject({ id: '7' });
  });
});
