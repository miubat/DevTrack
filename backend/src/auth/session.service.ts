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

export interface SessionUser {
  id: string;
  role: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  start(user: SessionUser): Promise<SessionTokens> {
    return this.issue(user);
  }

  async refresh(oldToken: string): Promise<SessionTokens> {
    // Revoke the old token in one step, so only one request can use it.
    const revoked = await this.db.query<{ id: string; user_id: string }>(
      `UPDATE refresh_tokens SET revoked_at = now()
        WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
        RETURNING id, user_id`,
      [hashToken(oldToken)],
    );
    if (revoked.length === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const users = await this.db.query<{
      id: string;
      role: string;
      is_active: boolean;
    }>(`SELECT id, role, is_active FROM users WHERE id = $1`, [
      revoked[0].user_id,
    ]);
    const user = users[0];
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issue(user, revoked[0].id);
  }

  async logout(token: string): Promise<void> {
    await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = now()
        WHERE token_hash = $1 AND revoked_at IS NULL`,
      [hashToken(token)],
    );
  }

  private async issue(
    user: SessionUser,
    replacesId?: string,
  ): Promise<SessionTokens> {
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(
      Date.now() + ttlToMs(process.env.JWT_REFRESH_TTL ?? '7d'),
    );

    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING id`,
      [user.id, hashToken(refreshToken), refreshExpiresAt],
    );
    if (replacesId) {
      await this.db.query(
        `UPDATE refresh_tokens SET replaced_by_id = $1 WHERE id = $2`,
        [rows[0].id, replacesId],
      );
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
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
