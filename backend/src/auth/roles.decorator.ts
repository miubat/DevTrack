import { SetMetadata } from '@nestjs/common';

// The system roles from the SRS (section 1.3).
export type SystemRole = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER';

export const ROLES_KEY = 'roles';

// Only the listed roles may call the route. Without it, any signed-in user may.
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
