import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SYSTEM_ROLES, type SystemRole } from '../../auth/roles.decorator.js';
import { trim } from './trim.js';

// Checks a field only when it is sent. null is not "not sent", so it is refused.
const sent = ValidateIf((_, value) => value !== undefined);

// PATCH /admin/users/{id} (FR-AUTH-02): send one or more of the fields.
export class UpdateUserDto {
  // Same rules as on create. users.full_name is VARCHAR(120).
  @sent
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @sent
  @IsIn(SYSTEM_ROLES)
  role?: SystemRole;

  // false deactivates the user, true reactivates them.
  @sent
  @IsBoolean()
  isActive?: boolean;
}
