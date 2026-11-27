import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { DatabaseService } from '../database/database.service.js';
import { IS_PUBLIC } from './public.decorator.js';

export interface AuthUser {
  id: string;
  role: string;
}

// Global guard: every route needs a valid access token unless it is marked @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) {
      throw this.unauthenticated('Not signed in');
    }

    let payload: { sub: string; role: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET,
        },
      );
    } catch {
      throw this.unauthenticated('Invalid or expired token');
    }

    // BUG-AGL-06.3-01 (NFR-SEC-02): deactivation must cut access at once, so a valid
    // token is not enough. The user must still exist and be active.
    const rows = await this.db.query<{ is_active: boolean; role: string }>(
      `SELECT is_active, role FROM users WHERE id = $1`,
      [payload.sub],
    );
    if (!rows[0]?.is_active) {
      throw this.unauthenticated('Invalid or expired token');
    }

    // AGL-08.2: after an admin changes the role, tokens with the old role are
    // refused, so the user must log in again and gets the new role everywhere.
    if (rows[0].role !== payload.role) {
      throw this.unauthenticated('Invalid or expired token');
    }

    req.user = { id: payload.sub, role: payload.role };
    return true;
  }

  private unauthenticated(message: string): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message,
    });
  }
}
