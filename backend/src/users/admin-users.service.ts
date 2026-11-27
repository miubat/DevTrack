import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { AuthUser } from '../auth/jwt-auth.guard.js';
import { DatabaseService } from '../database/database.service.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { ListUsersDto } from './dto/list-users.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

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

  // FR-AUTH-02: change the name, the role, or deactivate / reactivate.
  // The user is never deleted, so their issues, comments and activity keep their name.
  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthUser,
  ): Promise<AdminUser> {
    // users.id is BIGINT: anything else cannot be a user.
    if (!/^[1-9]\d{0,17}$/.test(id)) {
      throw notFound();
    }
    const { role, isActive } = dto;
    const fullName = dto.fullName?.trim();
    if (
      fullName === undefined &&
      role === undefined &&
      isActive === undefined
    ) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: ['Send at least one of fullName, role, isActive'],
        error: 'Bad Request',
      });
    }

    // An admin cannot lock themselves out: no own deactivation or role change.
    if (
      id === actor.id &&
      (isActive === false || (role !== undefined && role !== actor.role))
    ) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'CANNOT_CHANGE_SELF',
        message: 'You cannot deactivate yourself or change your own role.',
      });
    }

    // A field that is not sent keeps its value. "old" gives the role before the change.
    // FOR UPDATE: if another admin is changing this user at the same moment, wait
    // for them and read the role they saved, so roleChanged is never wrong.
    const rows = await this.db.query<UserRow & { old_role: string }>(
      `UPDATE users u
          SET full_name = COALESCE($2, u.full_name),
              role = COALESCE($3::system_role, u.role),
              is_active = COALESCE($4, u.is_active)
         FROM (SELECT id, role FROM users WHERE id = $1 FOR UPDATE) old
        WHERE u.id = old.id
        RETURNING u.id, u.full_name, u.email, u.role, u.is_active,
                  u.must_reset_pw, u.created_at, old.role AS old_role`,
      [id, fullName ?? null, role ?? null, isActive ?? null],
    );
    if (rows.length === 0) {
      throw notFound();
    }
    const roleChanged = rows[0].role !== rows[0].old_role;

    // The user must log in again after deactivation (NFR-SEC-02) or a role change
    // (so the app never runs with an old role). Refresh tokens are revoked here;
    // access tokens are refused by JwtAuthGuard (is_active and role checks).
    if (isActive === false || roleChanged) {
      await this.db.query(
        `UPDATE refresh_tokens SET revoked_at = now()
          WHERE user_id = $1 AND revoked_at IS NULL`,
        [id],
      );
    }

    return toAdminUser(rows[0]);
  }
}

function notFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'User not found.',
  });
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
