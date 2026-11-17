import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import { DatabaseService } from '../database/database.service';
import { hashToken, SessionService, ttlToMs } from './session.service';

function makeService(query: ReturnType<typeof vi.fn>) {
  const jwt = {
    signAsync: vi.fn().mockResolvedValue('access-jwt'),
  } as unknown as JwtService;
  process.env.JWT_ACCESS_SECRET = 'test-secret';
  return new SessionService({ query } as unknown as DatabaseService, jwt);
}

describe('ttlToMs', () => {
  it('converts 15m and 7d', () => {
    expect(ttlToMs('15m')).toBe(15 * 60_000);
    expect(ttlToMs('7d')).toBe(7 * 86_400_000);
  });

  it('rejects a bad value', () => {
    expect(() => ttlToMs('abc')).toThrow();
  });
});

describe('SessionService', () => {
  it('start stores only the hash of the refresh token', async () => {
    const query = vi.fn().mockResolvedValue([{ id: '10' }]);
    const tokens = await makeService(query).start({ id: '1', role: 'ADMIN' });

    expect(tokens.accessToken).toBe('access-jwt');
    expect(tokens.refreshToken.length).toBeGreaterThan(20);
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[1]).toBe(hashToken(tokens.refreshToken));
    expect(params[1]).not.toBe(tokens.refreshToken);
  });

  it('refresh rejects an old or unknown token with 401', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await expect(makeService(query).refresh('old-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refresh revokes the old token and issues a new one', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: '5', user_id: '1' }]) // revoke old
      .mockResolvedValueOnce([{ id: '1', role: 'ADMIN', is_active: true }]) // user
      .mockResolvedValueOnce([{ id: '6' }]) // insert new
      .mockResolvedValueOnce([]); // link old -> new
    const tokens = await makeService(query).refresh('good-token');

    expect(tokens.refreshToken).not.toBe('good-token');
    expect(query.mock.calls[0][0]).toContain('SET revoked_at = now()');
  });

  it('refresh rejects when the user is inactive', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: '5', user_id: '1' }])
      .mockResolvedValueOnce([{ id: '1', role: 'ADMIN', is_active: false }]);
    await expect(makeService(query).refresh('good-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('logout revokes the token by its hash', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await makeService(query).logout('some-token');
    expect(query.mock.calls[0][1]).toEqual([hashToken('some-token')]);
  });

  it('fails at startup when JWT_ACCESS_SECRET is missing', () => {
    delete process.env.JWT_ACCESS_SECRET;
    const jwt = {} as unknown as JwtService;
    expect(
      () =>
        new SessionService(
          { query: vi.fn() } as unknown as DatabaseService,
          jwt,
        ),
    ).toThrow('JWT_ACCESS_SECRET is not set');
  });
});
