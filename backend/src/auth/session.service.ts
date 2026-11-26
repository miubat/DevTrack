import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

export function ttlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    throw new Error(`Invalid TTL: ${ttl}`);
  }
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// What the access token says about the user. Read from the database every time
// a token is issued, so it is always current.
interface SessionUserRow {
  id: string;
  role: string;
  full_name: string;
  is_active: boolean;
  // AGL-08.4: true until the temporary password is replaced. In the token, so
  // the app knows after a page reload too.
  must_reset_pw: boolean;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const invalidRefreshToken = () =>
  new UnauthorizedException({
    statusCode: 401,
    code: 'UNAUTHENTICATED',
    message: 'Invalid refresh token',
    error: 'Unauthorized',
  });

// AGL-08.4: a session is one signed-in device. It lives across refresh-token
// rotation and ends on sign-out or a password change. Access tokens carry the
// session id ("sid"), and AccountGuard refuses them once the session has ended.
@Injectable()
export class SessionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error(
        'JWT_ACCESS_SECRET is not set. Copy backend/.env.example to backend/.env and set it.',
      );
    }
    // Fail at startup if a TTL value is wrong.
    ttlToMs(process.env.JWT_ACCESS_TTL ?? '15m');
    ttlToMs(process.env.JWT_REFRESH_TTL ?? '7d');
  }

  // A new session for a user who has just proved who they are (login, password change).
  async start(userId: string): Promise<SessionTokens> {
    const user = await this.loadUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    const sessions = await this.db.query<{ id: string }>(
      `INSERT INTO sessions (user_id) VALUES ($1) RETURNING id`,
      [userId],
    );
    return this.issue(user, sessions[0].id);
  }

  async refresh(oldToken: string): Promise<SessionTokens> {
    // Revoke the old token in one step, so only one request can use it.
    // Its session must still be open.
    const revoked = await this.db.query<{
      id: string;
      user_id: string;
      session_id: string;
    }>(
      `UPDATE refresh_tokens rt SET revoked_at = now()
         FROM sessions s
        WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL
          AND rt.expires_at > now()
          AND s.id = rt.session_id AND s.revoked_at IS NULL
        RETURNING rt.id, rt.user_id, rt.session_id`,
      [hashToken(oldToken)],
    );
    if (revoked.length === 0) {
      throw invalidRefreshToken();
    }

    const user = await this.loadUser(revoked[0].user_id);
    if (!user || !user.is_active) {
      throw invalidRefreshToken();
    }

    return this.issue(user, revoked[0].session_id, revoked[0].id);
  }

  // Ends every session of the user, and with them all their tokens.
  async revokeAll(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE sessions SET revoked_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
    await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  // Sign-out: ends the session of this refresh token. Its access tokens are
  // refused from now on, and the refresh token can no longer be used.
  async logout(token: string): Promise<void> {
    const rows = await this.db.query<{ session_id: string | null }>(
      `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now())
        WHERE token_hash = $1
        RETURNING session_id`,
      [hashToken(token)],
    );
    const sessionId = rows[0]?.session_id;
    if (sessionId) {
      await this.db.query(
        `UPDATE sessions SET revoked_at = now()
          WHERE id = $1 AND revoked_at IS NULL`,
        [sessionId],
      );
    }
  }

  private async loadUser(id: string): Promise<SessionUserRow | undefined> {
    const rows = await this.db.query<SessionUserRow>(
      `SELECT id, role, full_name, is_active, must_reset_pw
         FROM users WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  private async issue(
    user: SessionUserRow,
    sessionId: string,
    replacesId?: string,
  ): Promise<SessionTokens> {
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(
      Date.now() + ttlToMs(process.env.JWT_REFRESH_TTL ?? '7d'),
    );

    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, session_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [user.id, hashToken(refreshToken), refreshExpiresAt, sessionId],
    );
    if (replacesId) {
      await this.db.query(
        `UPDATE refresh_tokens SET replaced_by_id = $1 WHERE id = $2`,
        [rows[0].id, replacesId],
      );
    }

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        role: user.role,
        name: user.full_name, // shown in the user menu
        mustResetPassword: user.must_reset_pw,
        sid: sessionId,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: Math.floor(
          ttlToMs(process.env.JWT_ACCESS_TTL ?? '15m') / 1000,
        ),
      },
    );

    return { accessToken, refreshToken, refreshExpiresAt };
  }
}
