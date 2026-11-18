import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeAll, describe, expect, it } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const jwt = new JwtService({});
const guard = new JwtAuthGuard(jwt);

function ctx(authorization?: string) {
  const req: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: { authorization },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { req, context };
}

describe('JwtAuthGuard', () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-secret';
  });

  it('accepts a valid access token and sets the user', async () => {
    const token = await jwt.signAsync(
      { sub: '1', role: 'ADMIN' },
      { secret: 'test-secret', expiresIn: 60 },
    );
    const { req, context } = ctx(`Bearer ${token}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user).toEqual({ id: '1', role: 'ADMIN' });
  });

  it('rejects an expired access token with 401', async () => {
    const token = await jwt.signAsync(
      { sub: '1', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 10 },
      { secret: 'test-secret' },
    );
    await expect(
      guard.canActivate(ctx(`Bearer ${token}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a missing header and a token with a wrong signature', async () => {
    await expect(guard.canActivate(ctx().context)).rejects.toThrow(
      UnauthorizedException,
    );
    const bad = await jwt.signAsync(
      { sub: '1', role: 'ADMIN' },
      { secret: 'other-secret' },
    );
    await expect(
      guard.canActivate(ctx(`Bearer ${bad}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });
});
