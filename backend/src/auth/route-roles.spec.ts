import { Controller, Get, Module, Post, RequestMethod } from '@nestjs/common';
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
  Reflector,
} from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IS_PUBLIC, Public } from './public.decorator.js';
import { ROLES_KEY, Roles } from './roles.decorator.js';

// AGL-08.3 (NFR-SEC-03): every route must say who may call it, so a new endpoint
// that forgets @Roles(...) fails CI here instead of being refused at runtime.

// Nest's own metadata keys for @Controller('path'), @Get('path') and the HTTP method.
const PATH = 'path';
const METHOD = 'method';

interface RouteCheck {
  route: string;
  isPublic: boolean;
  hasRoles: boolean;
}

function listRoutes(moduleRef: TestingModule): RouteCheck[] {
  const discovery = moduleRef.get(DiscoveryService);
  const scanner = moduleRef.get(MetadataScanner);
  const reflector = new Reflector();
  const routes: RouteCheck[] = [];

  for (const { instance, metatype } of discovery.getControllers()) {
    if (!instance || !metatype) {
      continue;
    }
    const base = reflector.get<string>(PATH, metatype);
    const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
    for (const name of scanner.getAllMethodNames(proto)) {
      const handler = proto[name] as () => unknown;
      const path = reflector.get<string | undefined>(PATH, handler);
      if (path === undefined) {
        continue; // a helper method, not a route
      }
      const method =
        RequestMethod[reflector.get<RequestMethod>(METHOD, handler)];
      const targets = [handler, metatype];
      const roles = reflector.getAllAndOverride<string[] | undefined>(
        ROLES_KEY,
        targets,
      );
      routes.push({
        route: `${method} /${[base, path].filter((p) => p && p !== '/').join('/')}`,
        isPublic:
          reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) === true,
        hasRoles: Array.isArray(roles) && roles.length > 0,
      });
    }
  }
  return routes;
}

// A route is fine when it is exactly one of: @Public(), or @Roles(...) with at least one role.
function uncheckedRoutes(routes: RouteCheck[]): string[] {
  return routes.filter((r) => r.isPublic === r.hasRoles).map((r) => r.route);
}

describe('Every route checks the role (AGL-08.3, NFR-SEC-03)', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // The app module needs these to start. No database connection is made.
    process.env.DATABASE_URL ??=
      'postgresql://unused:unused@localhost:5432/unused';
    process.env.JWT_ACCESS_SECRET ??= 'route-check-only';
    const { AppModule } = await import('../app.module.js');
    moduleRef = await Test.createTestingModule({
      imports: [AppModule, DiscoveryModule],
    }).compile();
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('finds the app routes', () => {
    const routes = listRoutes(moduleRef).map((r) => r.route);
    expect(routes).toEqual(
      expect.arrayContaining(['GET /', 'POST /auth/login', 'GET /auth/me']),
    );
  });

  it('every route is either @Public() or has @Roles(...), never both or neither', () => {
    expect(uncheckedRoutes(listRoutes(moduleRef))).toEqual([]);
  });

  it('the check catches a route without a decorator (self-test)', async () => {
    @Controller('demo')
    class DemoController {
      @Get('open')
      @Public()
      open() {}

      @Get('admin')
      @Roles('ADMIN')
      admin() {}

      @Post('forgotten')
      forgotten() {}

      @Get('empty')
      @Roles()
      empty() {}
    }
    @Module({ controllers: [DemoController] })
    class DemoModule {}

    const demo = await Test.createTestingModule({
      imports: [DemoModule, DiscoveryModule],
    }).compile();
    try {
      expect(uncheckedRoutes(listRoutes(demo)).sort()).toEqual([
        'GET /demo/empty',
        'POST /demo/forgotten',
      ]);
    } finally {
      await demo.close();
    }
  });
});
