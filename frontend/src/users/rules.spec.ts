import { describe, expect, it } from 'vitest';
import type { AdminUser } from '../api/admin-users.ts';
import {
  changedFields,
  emailProblem,
  fullNameProblem,
  pagerLabel,
} from './rules.ts';

describe('fullNameProblem', () => {
  it('needs a name of at most 120 characters, spaces around not counted', () => {
    expect(fullNameProblem('')).toBe('Full name is required.');
    expect(fullNameProblem('   ')).toBe('Full name is required.');
    expect(fullNameProblem('a'.repeat(121))).toBe(
      'Use at most 120 characters.',
    );
    expect(fullNameProblem('  ' + 'a'.repeat(120) + '  ')).toBeUndefined();
    expect(fullNameProblem('Karim Hossain')).toBeUndefined();
  });
});

describe('emailProblem (same answer as the server)', () => {
  it.each([
    ['karim@devtrack.local', undefined],
    ['first.last@sub.devtrack.io', undefined],
    [' karim@devtrack.local ', undefined],
    ['', 'Email is required.'],
    ['a@b.c', 'Enter a valid email address.'],
    ['a@b.c1', 'Enter a valid email address.'],
    ['a b@x.io', 'Enter a valid email address.'],
    ['x@localhost', 'Enter a valid email address.'],
    ['a'.repeat(250) + '@x.io', 'Use at most 254 characters.'],
  ])('%j gives %j', (email, problem) => {
    expect(emailProblem(email)).toBe(problem);
  });
});

describe('changedFields', () => {
  const karim: AdminUser = {
    id: '4',
    fullName: 'Karim Hossain',
    email: 'karim@devtrack.local',
    role: 'TEAM_MEMBER',
    isActive: true,
    mustResetPassword: false,
    createdAt: '2026-10-01T04:00:00.000Z',
  };

  it('is empty when nothing changed (spaces around the name do not count)', () => {
    expect(changedFields(karim, ' Karim Hossain ', 'TEAM_MEMBER')).toEqual({});
  });

  it('lists only what changed', () => {
    expect(changedFields(karim, 'Karim H.', 'TEAM_MEMBER')).toEqual({
      fullName: 'Karim H.',
    });
    expect(changedFields(karim, 'Karim Hossain', 'PROJECT_MANAGER')).toEqual({
      role: 'PROJECT_MANAGER',
    });
  });
});

describe('pagerLabel', () => {
  it('says Loading... until the first list arrives, never "No users"', () => {
    expect(pagerLabel(null, true, 1, 25)).toBe('Loading...');
    expect(pagerLabel(null, false, 1, 25)).toBe('');
  });

  it('shows the range on the current page', () => {
    expect(pagerLabel(0, false, 1, 25)).toBe('No users');
    expect(pagerLabel(14, false, 1, 25)).toBe('Showing 1–14 of 14');
    expect(pagerLabel(31, false, 2, 25)).toBe('Showing 26–31 of 31');
  });
});
