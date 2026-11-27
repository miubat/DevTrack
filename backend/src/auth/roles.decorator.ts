import { SetMetadata } from '@nestjs/common';

// The system roles from the SRS (section 1.3).
export const SYSTEM_ROLES = [
  'ADMIN',
  'PROJECT_MANAGER',
  'TEAM_MEMBER',
] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ROLES_KEY = 'roles';

// Only the listed roles may call the route. A route with neither @Roles(...) nor
// @Public() is refused for everyone (AGL-08.3).
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
