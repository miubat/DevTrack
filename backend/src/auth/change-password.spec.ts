import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../database/database.service.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

describe('ChangePasswordDto (NFR-SEC-01)', () => {
  const errorsFor = (body: Record<string, unknown>) =>
    validateSync(plainToInstance(ChangePasswordDto, body)).map(
      (e) => e.property,
    );
  const valid = { currentPassword: 'Temp1234', newPassword: 'NewPass99' };

  it('accepts 8 and 64 character passwords with a letter and a digit', () => {
    expect(errorsFor(valid)).toEqual([]);
    expect(errorsFor({ ...valid, newPassword: 'abcdef12' })).toEqual([]);
    expect(errorsFor({ ...valid, newPassword: 'a1'.repeat(32) })).toEqual([]);
  });

  it.each([
    ['too short', 'abcde12'],
    ['too long', 'a1'.repeat(32) + 'x'],
    ['no digit', 'abcdefgh'],
    ['no letter', '12345678'],
    ['only non-English letters', 'пароль12'],
  ])('refuses a new password that is %s', (_, pw) => {
    expect(errorsFor({ ...valid, newPassword: pw })).toEqual(['newPassword']);
  });

  it('refuses an empty current password', () => {
    expect(errorsFor({ ...valid, currentPassword: '' })).toEqual([
      'currentPassword',
    ]);
  });
});

describe('AuthService.changePassword', () => {
  let hash: string;

  beforeAll(async () => {
    hash = await argon2.hash('Temp1234', { type: argon2.argon2id });
  });

  function makeService() {
    const calls: { sql: string; params: unknown[] }[] = [];
    const query = vi.fn((sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return Promise.resolve(
        sql.startsWith('SELECT password_hash') ? [{ password_hash: hash }] : [],
      );
    });
    const service = new AuthService({ query } as unknown as DatabaseService);
    return { service, calls };
  }

  it('saves an Argon2id hash and clears must_reset_pw', async () => {
    const { service, calls } = makeService();

    await service.changePassword('4', 'Temp1234', 'NewPass99');

    const update = calls.find((c) => c.sql.startsWith('UPDATE users'))!;
    expect(update.sql).toContain('must_reset_pw = FALSE');
    const [id, newHash] = update.params as string[];
    expect(id).toBe('4');
    expect(newHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await argon2.verify(newHash, 'NewPass99')).toBe(true);
  });

  it('refuses a wrong current password with 400 CURRENT_PASSWORD_WRONG', async () => {
    const { service, calls } = makeService();

    const error = await service
      .changePassword('4', 'Wrong999', 'NewPass99')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'CURRENT_PASSWORD_WRONG',
    });
    expect(calls.some((c) => c.sql.startsWith('UPDATE'))).toBe(false);
  });

  it('refuses a new password equal to the current one with 400 VALIDATION_FAILED', async () => {
    const { service, calls } = makeService();

    const error = await service
      .changePassword('4', 'Temp1234', 'Temp1234')
      .catch((e: unknown) => e);

    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    expect(calls.some((c) => c.sql.startsWith('UPDATE'))).toBe(false);
  });
});
