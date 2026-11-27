import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

// POST /me/password (SRS 5.3, FR-AUTH-02 first login).
export class ChangePasswordDto {
  // For a first login this is the temporary password.
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  // NFR-SEC-01: 8–64 characters with a letter and a digit.
  // Only A-Z and a-z count as a letter.
  @IsString()
  @Length(8, 64)
  @Matches(/[A-Za-z]/, {
    message: 'newPassword must contain a letter (A-Z or a-z)',
  })
  @Matches(/\d/, { message: 'newPassword must contain a digit' })
  newPassword: string;
}
