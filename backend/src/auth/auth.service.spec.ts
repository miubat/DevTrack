import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('AuthService.login', () => {
  let service: AuthService;
  let query: ReturnType<typeof vi.fn>;
  let activeUser: Record<string, unknown>;

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

  beforeEach(() => {
    query = vi.fn();
    service = new AuthService({ query } as unknown as DatabaseService);
  });

  it('returns the user without the password hash for a correct password', async () => {
    query.mockResolvedValue([activeUser]);
    const result = await service.login('admin@devtrack.local', 'Passw0rd1');
    expect(result).toEqual({
      id: '1',
      fullName: 'Admin User',
      email: 'admin@devtrack.local',
      role: 'ADMIN',
      mustResetPassword: false,
    });
    expect(JSON.stringify(result)).not.toContain('argon2');
  });

  it('rejects a wrong password with a generic 401', async () => {
    query.mockResolvedValue([activeUser]);
    await expect(
      service.login('admin@devtrack.local', 'wrong'),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });

  it('rejects an unknown email with the same generic 401', async () => {
    query.mockResolvedValue([]);
    await expect(
      service.login('nobody@devtrack.local', 'Passw0rd1'),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });

  it('rejects an inactive user with the same generic 401', async () => {
    query.mockResolvedValue([{ ...activeUser, is_active: false }]);
    await expect(
      service.login('admin@devtrack.local', 'Passw0rd1'),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });
});
