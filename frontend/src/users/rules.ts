// Checks and texts for the Users screen (AGL-08.5), kept out of the components
// so they are unit tested.

import type { AdminUser, UserChanges } from '../api/admin-users.ts';
import type { Role } from '../auth/roles.ts';

// users.full_name is VARCHAR(120); users.email is VARCHAR(254).
export const FULL_NAME_MAX = 120;
export const EMAIL_MAX = 254;

// Same as the server (class-validator isEmail) for the common cases: the part
// after the last dot has at least 2 letters, so "a@b.c" is refused here, not
// only after a round trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@.0-9]{2,}$/;

export function fullNameProblem(fullName: string): string | undefined {
  const name = fullName.trim();
  if (!name) {
    return 'Full name is required.';
  }
  if (name.length > FULL_NAME_MAX) {
    return `Use at most ${FULL_NAME_MAX} characters.`;
  }
  return undefined;
}

export function emailProblem(email: string): string | undefined {
  const value = email.trim();
  if (!value) {
    return 'Email is required.';
  }
  if (value.length > EMAIL_MAX) {
    return `Use at most ${EMAIL_MAX} characters.`;
  }
  if (!EMAIL_PATTERN.test(value)) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

// What the edit form would change; empty when nothing changed.
export function changedFields(
  user: AdminUser,
  fullName: string,
  role: Role,
): UserChanges {
  const changes: UserChanges = {};
  if (fullName.trim() !== user.fullName) {
    changes.fullName = fullName.trim();
  }
  if (role !== user.role) {
    changes.role = role;
  }
  return changes;
}

// The text under the table. total is null until the first list arrives.
export function pagerLabel(
  total: number | null,
  loading: boolean,
  page: number,
  size: number,
): string {
  if (total === null) {
    return loading ? 'Loading...' : '';
  }
  if (total === 0) {
    return 'No users';
  }
  const first = (page - 1) * size + 1;
  const last = Math.min(page * size, total);
  return `Showing ${first}–${last} of ${total}`;
}
