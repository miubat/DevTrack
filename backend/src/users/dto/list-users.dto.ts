import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// GET /admin/users?q=&page=&size= (SRS 5.3: size 1–100, default 25).
export class ListUsersDto {
  // Part of the name or email, case-insensitive.
  @IsOptional()
  @IsString()
  @MaxLength(254)
  q?: string;

  // The upper limit only refuses numbers too big to count exactly,
  // which would otherwise reach the database and fail with 500.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size: number = 25;
}
