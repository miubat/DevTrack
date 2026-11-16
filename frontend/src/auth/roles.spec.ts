import { describe, expect, it } from 'vitest';
import { menusFor, roleFromToken } from './roles.ts';

// Builds a fake access token with the given payload (signature is not checked here)
function fakeToken(payload: object): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${body}.signature`;
}

function labels(role: Parameters<typeof menusFor>[0]): string[] {
  return menusFor(role).map((item) => item.label);
}

describe('menusFor (each role sees only its own menus)', () => {
  it('admin sees every menu', () => {
    expect(labels('ADMIN')).toEqual([
      'Projects',
      'Dashboard',
      'Users',
      'Profile',
    ]);
  });

  it('project manager sees the dashboard but not user admin', () => {
    expect(labels('PROJECT_MANAGER')).toEqual([
      'Projects',
      'Dashboard',
      'Profile',
    ]);
  });

  it('team member sees no dashboard and no user admin', () => {
    expect(labels('TEAM_MEMBER')).toEqual(['Projects', 'Profile']);
  });

  it('a logged-out user sees no menus', () => {
    expect(labels(null)).toEqual([]);
  });
});

describe('roleFromToken', () => {
  it('reads the role from the token payload', () => {
    expect(
      roleFromToken(fakeToken({ sub: '1', role: 'PROJECT_MANAGER' })),
    ).toBe('PROJECT_MANAGER');
  });

  it('returns null for no token, a broken token or an unknown role', () => {
    expect(roleFromToken(null)).toBeNull();
    expect(roleFromToken('not-a-token')).toBeNull();
    expect(
      roleFromToken(fakeToken({ sub: '1', role: 'SUPERUSER' })),
    ).toBeNull();
  });
});
