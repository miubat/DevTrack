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
    const tokens = await makeService(query).start('1');

    expect(tokens.accessToken).toBe('access-jwt');
    expect(tokens.refreshToken.length).toBeGreaterThan(20);
    const insert = query.mock.calls.find(([sql]) =>
      (sql as string).includes('INSERT INTO refresh_tokens'),
    )!;
    const params = insert[1] as unknown[];
    expect(params[1]).toBe(hashToken(tokens.refreshToken));
    expect(params[1]).not.toBe(tokens.refreshToken);
  });

  it('start opens a session and puts it in the access token with role, name and the temporary-password flag (AGL-08.4)', async () => {
    const query = vi.fn((sql: string) =>
      Promise.resolve(
        sql.includes('FROM users')
          ? [
              {
                id: '11',
                role: 'TEAM_MEMBER',
                full_name: 'Tania Akter',
                is_active: true,
                must_reset_pw: true,
              },
            ]
          : sql.includes('INSERT INTO sessions')
            ? [{ id: '7' }]
            : [{ id: '10' }],
      ),
    );
    const service = makeService(query as unknown as ReturnType<typeof vi.fn>);
    const jwt = (
      service as unknown as { jwt: { signAsync: ReturnType<typeof vi.fn> } }
    ).jwt;

    await service.start('11');

    expect(jwt.signAsync.mock.calls[0][0]).toEqual({
      sub: '11',
      role: 'TEAM_MEMBER',
      name: 'Tania Akter',
      mustResetPassword: true,
      sid: '7',
    });
    const insert = query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO refresh_tokens'),
    )!;
    expect(insert[1][3]).toBe('7'); // the refresh token belongs to the session
  });

  it('revokeAll ends every session and refresh token of the user', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await makeService(query).revokeAll('4');

    const sqls = query.mock.calls.map(([sql]) => sql as string);
    expect(sqls[0]).toContain('UPDATE sessions SET revoked_at = now()');
    expect(sqls[1]).toContain('UPDATE refresh_tokens SET revoked_at = now()');
    expect(query.mock.calls.every(([, params]) => params[0] === '4')).toBe(
      true,
    );
  });

  it('logout ends the session of the refresh token (AGL-08.4)', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ session_id: '7' }])
      .mockResolvedValueOnce([]);
    await makeService(query).logout('some-token');

    expect(query.mock.calls[1][0]).toContain('UPDATE sessions SET revoked_at');
    expect(query.mock.calls[1][1]).toEqual(['7']);
  });

  it('refresh only works while the session is open, and keeps the session', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: '5', user_id: '1', session_id: '7' }]) // revoke old
      .mockResolvedValueOnce([
        { id: '1', role: 'ADMIN', full_name: 'Admin', is_active: true },
      ]) // user
      .mockResolvedValueOnce([{ id: '6' }]) // insert new
      .mockResolvedValueOnce([]); // link old -> new
    await makeService(query).refresh('good-token');

    expect(query.mock.calls[0][0]).toContain('s.revoked_at IS NULL');
    expect(query.mock.calls[2][1][3]).toBe('7');
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
      .mockResolvedValueOnce([{ id: '5', user_id: '1', session_id: '7' }]) // revoke old
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

  it('refresh only accepts tokens that are not revoked and not expired', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await expect(makeService(query).refresh('expired-token')).rejects.toThrow(
      UnauthorizedException,
    );
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('revoked_at IS NULL');
    expect(sql).toContain('expires_at > now()');
  });
});
