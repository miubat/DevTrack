import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../database/database.service.js';
import { AccountGuard, AllowDuringPasswordChange } from './account.guard.js';
import { Public } from './public.decorator.js';

const jwt = new JwtService({});
const karim = { id: '4', role: 'TEAM_MEMBER' };
const claims = { sub: '4', name: 'Karim Hossain', sid: '7' };

interface Account {
  must_reset_pw: boolean;
  full_name: string;
  session_open: boolean;
}
const open: Account = {
  must_reset_pw: false,
  full_name: 'Karim Hossain',
  session_open: true,
};

function makeGuard(account: Account) {
  const query = vi.fn().mockResolvedValue([account]);
  const guard = new AccountGuard(
    new Reflector(),
    { query } as unknown as DatabaseService,
    jwt,
  );
  return { guard, query };
}

async function ctx(
  handler: () => void,
  payload: Record<string, unknown> | null,
  user: { id: string; role: string } | undefined = karim,
) {
  const token = payload
    ? await jwt.signAsync(payload, { secret: 'x', expiresIn: 60 })
    : undefined;
  return {
    getHandler: () => handler,
    getClass: () => class Dummy {},
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        headers: { authorization: token ? `Bearer ${token}` : undefined },
      }),
    }),
  } as unknown as ExecutionContext;
}

async function refusedWith(guard: AccountGuard, context: ExecutionContext) {
  const error = await guard.canActivate(context).catch((e: unknown) => e);
  return error as UnauthorizedException | ForbiddenException;
}

const route = () => undefined;

describe('AccountGuard (AGL-08.4)', () => {
  it('lets a token from an open session through, checking that session', async () => {
    const { guard, query } = makeGuard(open);
    await expect(guard.canActivate(await ctx(route, claims))).resolves.toBe(
      true,
    );
    expect(query.mock.calls[0][1]).toEqual(['4', '7']);
  });

  it('refuses a token whose session has ended (sign-out, password change) with 401 at once', async () => {
    const { guard } = makeGuard({ ...open, session_open: false });
    const error = await refusedWith(guard, await ctx(route, claims));
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.getResponse()).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('refuses a token without a session id (issued before AGL-08.4)', async () => {
    const { guard, query } = makeGuard({ ...open, session_open: false });
    const { sid: _sid, ...noSid } = claims;
    const error = await refusedWith(guard, await ctx(route, noSid));
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(query.mock.calls[0][1]).toEqual(['4', null]);
  });

  it('refuses a token with an old name (renamed by an admin) with 401, so the app refreshes it', async () => {
    const { guard } = makeGuard({ ...open, full_name: 'Karim H.' });
    const error = await refusedWith(guard, await ctx(route, claims));
    expect(error).toBeInstanceOf(UnauthorizedException);
  });

  it('refuses other routes with 403 PASSWORD_CHANGE_REQUIRED while the password is temporary', async () => {
    const { guard } = makeGuard({ ...open, must_reset_pw: true });
    const error = await refusedWith(guard, await ctx(route, claims));
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
  });

  it('allows the password change route, but still needs an open session there', async () => {
    const change = () => undefined;
    AllowDuringPasswordChange()(change);
    const current = makeGuard({ ...open, must_reset_pw: true }).guard;
    await expect(current.canActivate(await ctx(change, claims))).resolves.toBe(
      true,
    );
    const ended = makeGuard({
      ...open,
      must_reset_pw: true,
      session_open: false,
    }).guard;
    await expect(ended.canActivate(await ctx(change, claims))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('lets @Public routes through without a lookup', async () => {
    const pub = () => undefined;
    Public()(pub);
    const { guard, query } = makeGuard({ ...open, session_open: false });
    await expect(
      guard.canActivate(await ctx(pub, null, undefined)),
    ).resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });
});
