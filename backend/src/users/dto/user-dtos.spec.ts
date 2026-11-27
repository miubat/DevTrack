import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateUserDto } from './create-user.dto.js';
import { ListUsersDto } from './list-users.dto.js';

function errorsFor<T extends object>(
  cls: new () => T,
  body: Record<string, unknown>,
): string[] {
  return validateSync(plainToInstance(cls, body)).map((e) => e.property);
}

function messagesFor<T extends object>(
  cls: new () => T,
  body: Record<string, unknown>,
): string[] {
  return validateSync(plainToInstance(cls, body)).flatMap((e) =>
    Object.values(e.constraints ?? {}),
  );
}

const valid = {
  fullName: 'Rahim Ahmed',
  email: 'rahim@devtrack.local',
  role: 'PROJECT_MANAGER',
  temporaryPassword: 'Temp1234',
};

describe('CreateUserDto', () => {
  it('accepts a valid body', () => {
    expect(errorsFor(CreateUserDto, valid)).toEqual([]);
  });

  it.each([
    ['too short', 'Temp123'],
    ['too long', 'a1'.repeat(32) + 'x'],
    ['no digit', 'TempTemp'],
    ['no letter', '12345678'],
    ['only non-English letters', 'পাসওয়ার্ড1234'],
    ['only non-English letters', 'пароль12'],
  ])('refuses a temporary password with %s (NFR-SEC-01)', (_, pw) => {
    expect(
      errorsFor(CreateUserDto, { ...valid, temporaryPassword: pw }),
    ).toEqual(['temporaryPassword']);
  });

  it('accepts passwords of exactly 8 and 64 characters', () => {
    for (const pw of ['Temp1234', 'a1'.repeat(32)]) {
      expect(
        errorsFor(CreateUserDto, { ...valid, temporaryPassword: pw }),
      ).toEqual([]);
    }
  });

  it('refuses an unknown role, a bad email and a blank name', () => {
    expect(
      errorsFor(CreateUserDto, {
        ...valid,
        role: 'SUPER_ADMIN',
        email: 'not-an-email',
        fullName: '   ',
      }).sort(),
    ).toEqual(['email', 'fullName', 'role']);
  });

  it('refuses a name longer than 120 characters', () => {
    expect(
      errorsFor(CreateUserDto, { ...valid, fullName: 'a'.repeat(121) }),
    ).toEqual(['fullName']);
  });

  it('does not count spaces around the name and email', () => {
    expect(
      errorsFor(CreateUserDto, {
        ...valid,
        fullName: '  ' + 'a'.repeat(120) + '  ',
        email: ' rahim@devtrack.local ',
      }),
    ).toEqual([]);
  });

  it('gives one message for an empty name and one for an empty email', () => {
    expect(
      messagesFor(CreateUserDto, { ...valid, fullName: '   ', email: '' }),
    ).toEqual(['fullName should not be empty', 'email must be an email']);
  });
});

describe('ListUsersDto', () => {
  it('defaults to page 1 and size 25', () => {
    const dto = plainToInstance(ListUsersDto, {});
    expect(validateSync(dto)).toEqual([]);
    expect(dto).toMatchObject({ page: 1, size: 25 });
  });

  it('refuses size 0, size 101 and page 0', () => {
    expect(errorsFor(ListUsersDto, { size: '0' })).toEqual(['size']);
    expect(errorsFor(ListUsersDto, { size: '101' })).toEqual(['size']);
    expect(errorsFor(ListUsersDto, { page: '0' })).toEqual(['page']);
  });

  it('refuses a page number too big to count exactly', () => {
    expect(errorsFor(ListUsersDto, { page: '99999999999999999999' })).toEqual([
      'page',
    ]);
    expect(errorsFor(ListUsersDto, { page: '9007199254740991' })).toEqual([]);
  });
});
