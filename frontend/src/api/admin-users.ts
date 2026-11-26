// User administration (FR-AUTH-02, SRS §5.3): Admin only.
// Backend: GET and POST /admin/users, PATCH /admin/users/{id} (AGL-08.1, 08.2).

import { apiFetch } from './client.ts';
import { apiPath } from './paths.ts';
import type { Role } from '../auth/roles.ts';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustResetPassword: boolean;
  createdAt: string;
}

export interface UserPage {
  items: AdminUser[];
  total: number;
  page: number;
  size: number;
}

export interface NewUser {
  fullName: string;
  email: string;
  role: Role;
  temporaryPassword: string;
}

export interface UserChanges {
  fullName?: string;
  role?: Role;
  isActive?: boolean;
}

// email-taken: 409 EMAIL_TAKEN
// self: 422 CANNOT_CHANGE_SELF (own role or own deactivation)
// not-found: 404 (the user no longer exists)
// invalid: 400 VALIDATION_FAILED
// server: anything else, or the backend cannot be reached
export type AdminUsersErrorKind =
  'email-taken' | 'self' | 'not-found' | 'invalid' | 'server';

const MESSAGES: Record<AdminUsersErrorKind, string> = {
  'email-taken': 'A user with this email already exists.',
  self: 'You cannot deactivate yourself or change your own role.',
  'not-found': 'This user no longer exists. Reload the list.',
  invalid: 'Some fields are not valid. Check them and try again.',
  server: 'Something went wrong. Please try again.',
};

export class AdminUsersError extends Error {
  readonly kind: AdminUsersErrorKind;

  constructor(kind: AdminUsersErrorKind) {
    super(MESSAGES[kind]);
    this.kind = kind;
  }
}

async function call(path: string, init: RequestInit = {}): Promise<unknown> {
  let res: Response;
  try {
    res = await apiFetch(apiPath(path), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new AdminUsersError('server'); // network down
  }
  if (res.ok) {
    return res.json();
  }
  const body = (await res.json().catch(() => ({}))) as { code?: string };
  if (res.status === 409 && body.code === 'EMAIL_TAKEN') {
    throw new AdminUsersError('email-taken');
  }
  if (res.status === 422 && body.code === 'CANNOT_CHANGE_SELF') {
    throw new AdminUsersError('self');
  }
  if (res.status === 404) {
    throw new AdminUsersError('not-found');
  }
  if (res.status === 400) {
    throw new AdminUsersError('invalid');
  }
  throw new AdminUsersError('server');
}

// One page of users; q searches name and email.
export async function listUsers(params: {
  q?: string;
  page: number;
  size: number;
}): Promise<UserPage> {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  const q = params.q?.trim();
  if (q) {
    query.set('q', q);
  }
  return (await call(`/admin/users?${query.toString()}`)) as UserPage;
}

export async function createUser(user: NewUser): Promise<AdminUser> {
  return (await call('/admin/users', {
    method: 'POST',
    body: JSON.stringify(user),
  })) as AdminUser;
}

// Sends only the fields that changed.
export async function updateUser(
  id: string,
  changes: UserChanges,
): Promise<AdminUser> {
  return (await call(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })) as AdminUser;
}
