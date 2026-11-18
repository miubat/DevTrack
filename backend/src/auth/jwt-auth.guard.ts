import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
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
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET,
        },
      );
      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw this.unauthenticated('Invalid or expired token');
    }
  }

  private unauthenticated(message: string): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message,
    });
  }
}
