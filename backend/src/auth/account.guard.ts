import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { DatabaseService } from '../database/database.service.js';
import type { AuthUser } from './jwt-auth.guard.js';
import { IS_PUBLIC } from './public.decorator.js';

export const ALLOW_DURING_PASSWORD_CHANGE = 'allowDuringPasswordChange';

// Marks a route a user may call before replacing the temporary password.
export const AllowDuringPasswordChange = () =>
  SetMetadata(ALLOW_DURING_PASSWORD_CHANGE, true);

// AGL-08.4. Global guard, runs after JwtAuthGuard (which has already checked the
// token signature, expiry and that the user is active). One lookup, three checks:
// 1. The token's session must still be open. Sign-out and a password change end
//    sessions, so their access tokens get 401 at once (not after 15 minutes).
// 2. The name in the token must still be the user's name. After an admin renames
//    the user the token is out of date: 401, and the app gets a fresh token with
//    the refresh cookie and retries, so the user stays signed in.
// 3. A user with a temporary password must set a new one before using DevTrack:
//    every other route answers 403 PASSWORD_CHANGE_REQUIRED (FR-AUTH-02).
@Injectable()
export class AccountGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, targets)
    ) {
      return true;
    }
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!req.user) {
      return true; // JwtAuthGuard has already refused requests without a user
    }

    // JwtAuthGuard has verified this token, so reading it here is safe.
    // Tokens from before AGL-08.4 have no session id, so they are refused.
    const token = (req.headers.authorization ?? '').split(' ')[1] ?? '';
    const payload = this.jwt.decode<{ sid?: string; name?: string } | null>(
      token,
    );

    const rows = await this.db.query<{
      must_reset_pw: boolean;
      full_name: string;
      session_open: boolean;
    }>(
      `SELECT u.must_reset_pw, u.full_name,
              (s.id IS NOT NULL AND s.revoked_at IS NULL) AS session_open
         FROM users u
         LEFT JOIN sessions s ON s.id = $2 AND s.user_id = u.id
        WHERE u.id = $1`,
      [req.user.id, payload?.sid ?? null],
    );
    const account = rows[0];
    if (
      !account ||
      !account.session_open ||
      payload?.name !== account.full_name
    ) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Invalid or expired token',
      });
    }

    if (
      account.must_reset_pw &&
      !this.reflector.getAllAndOverride<boolean | undefined>(
        ALLOW_DURING_PASSWORD_CHANGE,
        targets,
      )
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Set a new password before using DevTrack.',
      });
    }
    return true;
  }
}
