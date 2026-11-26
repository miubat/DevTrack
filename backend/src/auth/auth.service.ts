import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  must_reset_pw: boolean;
}

// NFR-SEC-01: Argon2id, 19 MiB, 2 iterations (same as the seed).
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

// FR-AUTH-04: 5 failed logins for one account within 15 minutes lock it.
export const MAX_FAILED_LOGINS = 5;
export const LOCK_WINDOW_MINUTES = 15;

export class LoginLockedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Too many failed logins');
  }
}

@Injectable()
export class AuthService {
  // Used when the email does not exist, so the response time looks the same.
  // Same options as the seed hashes (19 MiB, 2 iterations).
  private readonly dummyHash = argon2.hash(
    'not-a-real-password',
    ARGON2_OPTIONS,
  );

  constructor(private readonly db: DatabaseService) {}

  async login(email: string, password: string) {
    const key = email.trim().toLowerCase();
    await this.assertNotLocked(key);

    const rows = await this.db.query<UserRow>(
      `SELECT id, full_name, email, password_hash, role, is_active, must_reset_pw
         FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    const user = rows[0];
    const hash = user ? user.password_hash : await this.dummyHash;
    const passwordOk = await argon2.verify(hash, password).catch(() => false);

    if (!user || !user.is_active || !passwordOk) {
      await this.recordFailure(key);
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        error: 'Unauthorized',
      });
    }

    await this.db.query(`DELETE FROM failed_logins WHERE email = $1`, [key]);
    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      mustResetPassword: user.must_reset_pw,
    };
  }

  // POST /me/password. AGL-08.4: also ends the "temporary password" state.
  // The caller ends the user's sessions (SessionService.revokeAll).
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const rows = await this.db.query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId],
    );
    const user = rows[0];
    const currentOk =
      user &&
      (await argon2
        .verify(user.password_hash, currentPassword)
        .catch(() => false));
    if (!currentOk) {
      // FR-AUTH-03: 400 CURRENT_PASSWORD_WRONG
      throw new BadRequestException({
        statusCode: 400,
        code: 'CURRENT_PASSWORD_WRONG',
        message: 'The current password is wrong.',
        error: 'Bad Request',
      });
    }
    // The admin knows the temporary password, so it cannot be kept.
    if (newPassword === currentPassword) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: ['newPassword must be different from the current password'],
        error: 'Bad Request',
      });
    }

    const hash = await argon2.hash(newPassword, ARGON2_OPTIONS);
    await this.db.query(
      `UPDATE users SET password_hash = $2, must_reset_pw = FALSE WHERE id = $1`,
      [userId, hash],
    );
  }

  // A locked attempt is not recorded, so the lock does not get longer.
  private async assertNotLocked(key: string): Promise<void> {
    const rows = await this.db.query<{ n: number; wait: number | null }>(
      `SELECT count(*)::int AS n,
              ceil(extract(epoch FROM (min(created_at) + make_interval(mins => $2) - now())))::int AS wait
         FROM failed_logins
        WHERE email = $1 AND created_at > now() - make_interval(mins => $2)`,
      [key, LOCK_WINDOW_MINUTES],
    );
    const { n, wait } = rows[0];
    if (n >= MAX_FAILED_LOGINS) {
      throw new LoginLockedError(Math.max(1, wait ?? 1));
    }
  }

  private async recordFailure(key: string): Promise<void> {
    await this.db.query(`INSERT INTO failed_logins (email) VALUES ($1)`, [key]);
    // Housekeeping: old rows are no longer needed.
    await this.db.query(
      `DELETE FROM failed_logins WHERE created_at < now() - interval '1 day'`,
    );
  }
}
