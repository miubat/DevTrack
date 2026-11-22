import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { beforeAll, describe, expect, it } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { Public } from './public.decorator.js';

const jwt = new JwtService({});
const guard = new JwtAuthGuard(jwt, new Reflector());

function ctx(handler: () => void, authorization?: string) {
  const req: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: { authorization },
  };
  const context = {
    getHandler: () => handler,
    getClass: () => class Dummy {},
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
    const { req, context } = ctx(() => undefined, `Bearer ${token}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user).toEqual({ id: '1', role: 'ADMIN' });
  });

  it('rejects an expired access token with 401 UNAUTHENTICATED', async () => {
    const token = await jwt.signAsync(
      { sub: '1', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 10 },
      { secret: 'test-secret' },
    );
    const error = await guard
      .canActivate(ctx(() => undefined, `Bearer ${token}`).context)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('rejects a missing header and a token with a wrong signature', async () => {
    await expect(
      guard.canActivate(ctx(() => undefined).context),
    ).rejects.toThrow(UnauthorizedException);
    const bad = await jwt.signAsync(
      { sub: '1', role: 'ADMIN' },
      { secret: 'other-secret' },
    );
    await expect(
      guard.canActivate(ctx(() => undefined, `Bearer ${bad}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lets a @Public route through without a token', async () => {
    const handler = () => undefined;
    Public()(handler);
    await expect(guard.canActivate(ctx(handler).context)).resolves.toBe(true);
  });
});
