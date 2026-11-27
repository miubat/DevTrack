import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { SYSTEM_ROLES, type SystemRole } from '../../auth/roles.decorator.js';

// Spaces around the name and email are not checked, because they are not saved.
const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

// POST /admin/users (FR-AUTH-02).
export class CreateUserDto {
  // users.full_name is VARCHAR(120).
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  // users.email is VARCHAR(254).
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsIn(SYSTEM_ROLES)
  role: SystemRole;

  // NFR-SEC-01: 8–64 characters with a letter and a digit.
  // Only A-Z and a-z count as a letter.
  @IsString()
  @Length(8, 64)
  @Matches(/[A-Za-z]/, {
    message: 'temporaryPassword must contain a letter (A-Z or a-z)',
  })
  @Matches(/\d/, { message: 'temporaryPassword must contain a digit' })
  temporaryPassword: string;
}
