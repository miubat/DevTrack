// Who sees which menu (AGL-05.3, SRS §1.3 and §5.4).
// One list for both the menu bar and the page guard, so they never disagree.
// This only hides UI. The backend still checks every request (403).

export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER';

export interface MenuItem {
  label: string;
  path: string;
  roles: Role[];
}

const ALL_ROLES: Role[] = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'];

export const MENU: MenuItem[] = [
  { label: 'Projects', path: '/projects', roles: ALL_ROLES },
  {
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['ADMIN', 'PROJECT_MANAGER'],
  },
  { label: 'Users', path: '/admin/users', roles: ['ADMIN'] },
  { label: 'Profile', path: '/profile', roles: ALL_ROLES },
];

export function menusFor(role: Role | null): MenuItem[] {
  if (!role) {
    return [];
  }
  return MENU.filter((item) => item.roles.includes(role));
}

// Reads the role from the access token payload ({ sub, role }).
// Safe to read here: the token is not secret to its owner, and the server verifies it.
export function roleFromToken(token: string | null): Role | null {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const role = (JSON.parse(json) as { role?: unknown }).role;
    return ALL_ROLES.includes(role as Role) ? (role as Role) : null;
  } catch {
    return null; // broken token: treat as logged out
  }
}
