import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { ListUsersDto } from './dto/list-users.dto.js';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  must_reset_pw: boolean;
  created_at: Date;
}

// What the API returns for a user. Never includes the password hash.
export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  mustResetPassword: boolean;
  createdAt: Date;
}

const USER_COLUMNS = `id, full_name, email, role, is_active, must_reset_pw, created_at`;

// PostgreSQL error code for a unique constraint.
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class AdminUsersService {
  constructor(private readonly db: DatabaseService) {}

  async list(query: ListUsersDto) {
    const { page, size } = query;
    const q = query.q?.trim() ?? '';
    // Escape LIKE wildcards so "%" and "_" are searched as text.
    const params: unknown[] = q ? [`%${q.replace(/[\\%_]/g, '\\$&')}%`] : [];
    const where = q ? `WHERE full_name ILIKE $1 OR email ILIKE $1` : '';
    const n = params.length;

    const [rows, count] = await Promise.all([
      this.db.query<UserRow>(
        `SELECT ${USER_COLUMNS} FROM users ${where}
          ORDER BY lower(full_name), id
          LIMIT $${n + 1} OFFSET $${n + 2}`,
        [...params, size, (page - 1) * size],
      ),
      this.db.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM users ${where}`,
        params,
      ),
    ]);

    return {
      items: rows.map(toAdminUser),
      total: count[0].total,
      page,
      size,
    };
  }

  async create(dto: CreateUserDto): Promise<AdminUser> {
    const email = dto.email.trim().toLowerCase();

    // The column is UNIQUE but case-sensitive; login matches emails without case.
    const existing = await this.db.query(
      `SELECT 1 FROM users WHERE lower(email) = $1`,
      [email],
    );
    if (existing.length > 0) {
      throw emailTaken();
    }

    // NFR-SEC-01: Argon2id, 19 MiB, 2 iterations (same as the seed).
    const passwordHash = await argon2.hash(dto.temporaryPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    try {
      // must_reset_pw = TRUE: the user sets a new password at first login (FR-AUTH-02).
      const rows = await this.db.query<UserRow>(
        `INSERT INTO users (full_name, email, password_hash, role, must_reset_pw)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING ${USER_COLUMNS}`,
        [dto.fullName.trim(), email, passwordHash, dto.role],
      );
      return toAdminUser(rows[0]);
    } catch (e) {
      // Two admins creating the same email at the same moment.
      if ((e as { code?: string }).code === UNIQUE_VIOLATION) {
        throw emailTaken();
      }
      throw e;
    }
  }
}

function emailTaken(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'EMAIL_TAKEN',
    message: 'A user with this email already exists.',
  });
}

function toAdminUser(row: UserRow): AdminUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    mustResetPassword: row.must_reset_pw,
    createdAt: row.created_at,
  };
}
