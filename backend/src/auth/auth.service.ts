import { Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  // Used when the email does not exist, so the response time looks the same.
  // The options match the seed users' hashes, so both cases take the same time.
  private readonly dummyHash = argon2.hash('not-a-real-password', {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  constructor(private readonly db: DatabaseService) {}

  async login(email: string, password: string) {
    const rows = await this.db.query<UserRow>(
      `SELECT id, full_name, email, password_hash, role, is_active, must_reset_pw
         FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    const user = rows[0];
    const hash = user ? user.password_hash : await this.dummyHash;
    const passwordOk = await argon2.verify(hash, password).catch(() => false);

    if (!user || !user.is_active || !passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      mustResetPassword: user.must_reset_pw,
    };
  }
}
