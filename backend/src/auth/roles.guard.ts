import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from './jwt-auth.guard.js';
import { ROLES_KEY, SystemRole } from './roles.decorator.js';

// Global guard, runs after JwtAuthGuard: a wrong role gets 403 FORBIDDEN_ROLE.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<SystemRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles || roles.length === 0) {
      return true;
    }
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!req.user || !roles.includes(req.user.role as SystemRole)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FORBIDDEN_ROLE',
        message: 'You do not have permission to do this.',
      });
    }
    return true;
  }
}
