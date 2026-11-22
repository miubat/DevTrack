// Seed users (db/prisma/seed.ts). They all share one password.
export const PASSWORD = 'Passw0rd1';

export interface SeedUser {
  label: string;
  email: string;
  // Menu links this role sees, in the order the NavBar shows them (SRS section 1.3).
  menu: string[];
}

export const ADMIN: SeedUser = {
  label: 'admin',
  email: 'admin@devtrack.local',
  menu: ['Projects', 'Dashboard', 'Users', 'Profile'],
};

export const PROJECT_MANAGER: SeedUser = {
  label: 'project manager',
  email: 'rahim@devtrack.local',
  menu: ['Projects', 'Dashboard', 'Profile'],
};

export const TEAM_MEMBER: SeedUser = {
  label: 'team member',
  email: 'karim@devtrack.local',
  menu: ['Projects', 'Profile'],
};

export const ALL_USERS = [ADMIN, PROJECT_MANAGER, TEAM_MEMBER];
