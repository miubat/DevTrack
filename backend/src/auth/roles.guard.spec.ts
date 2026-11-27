import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { Public } from './public.decorator.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

const guard = new RolesGuard(new Reflector());

function ctx(handler: () => void, user?: { id: string; role: string }) {
  return {
    getHandler: () => handler,
    getClass: () => class Dummy {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('refuses every role with 403 when the route has no @Roles (deny by default, AGL-08.3)', () => {
    const handler = () => undefined;
    for (const role of ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER']) {
      let error: unknown;
      try {
        guard.canActivate(ctx(handler, { id: '1', role }));
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'FORBIDDEN_ROLE',
      });
    }
  });

  it('lets a @Public route through without a user or @Roles', () => {
    const handler = () => undefined;
    Public()(handler);
    expect(guard.canActivate(ctx(handler))).toBe(true);
  });

  it('lets an allowed role through', () => {
    const handler = () => undefined;
    Roles('ADMIN', 'PROJECT_MANAGER')(handler);
    expect(
      guard.canActivate(ctx(handler, { id: '2', role: 'PROJECT_MANAGER' })),
    ).toBe(true);
  });

  it('refuses a wrong role with 403 FORBIDDEN_ROLE', () => {
    const handler = () => undefined;
    Roles('ADMIN')(handler);
    let error: unknown;
    try {
      guard.canActivate(ctx(handler, { id: '3', role: 'TEAM_MEMBER' }));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: 'FORBIDDEN_ROLE',
    });
  });

  it('refuses a request without a user', () => {
    const handler = () => undefined;
    Roles('ADMIN')(handler);
    expect(() => guard.canActivate(ctx(handler))).toThrow(ForbiddenException);
  });
});
