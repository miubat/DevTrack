import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from './jwt-auth.guard.js';
import { IS_PUBLIC } from './public.decorator.js';
import { ROLES_KEY, SystemRole } from './roles.decorator.js';

// Global guard, runs after JwtAuthGuard: a wrong role gets 403 FORBIDDEN_ROLE.
// AGL-08.3 (NFR-SEC-03): deny by default. Every route must be @Public() or list
// its roles with @Roles(...); a route with neither is refused for everyone.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, targets)
    ) {
      return true;
    }
    const roles = this.reflector.getAllAndOverride<SystemRole[] | undefined>(
      ROLES_KEY,
      targets,
    );
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!roles || !req.user || !roles.includes(req.user.role as SystemRole)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FORBIDDEN_ROLE',
        message: 'You do not have permission to do this.',
      });
    }
    return true;
  }
}
