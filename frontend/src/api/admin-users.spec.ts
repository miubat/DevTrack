import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdminUsersError,
  createUser,
  listUsers,
  updateUser,
} from './admin-users.ts';
import { setAccessToken } from './token.ts';

const fetchMock = vi.fn();

function reply(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status });
}

async function errorOf(p: Promise<unknown>): Promise<AdminUsersError> {
  const error = await p.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AdminUsersError);
  return error as AdminUsersError;
}

beforeEach(() => {
  setAccessToken('token');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listUsers', () => {
  it('asks for one page, with the search only when there is one', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(reply(200, { items: [], total: 0, page: 1, size: 25 })),
    );

    await listUsers({ page: 2, size: 25 });
    await listUsers({ q: '  karim ', page: 1, size: 25 });

    expect(fetchMock.mock.calls[0][0]).toBe('/admin/users?page=2&size=25');
    expect(fetchMock.mock.calls[1][0]).toBe(
      '/admin/users?page=1&size=25&q=karim',
    );
  });
});

describe('createUser', () => {
  it('posts the new user', async () => {
    fetchMock.mockResolvedValueOnce(reply(201, { id: '12' }));

    await createUser({
      fullName: 'New Person',
      email: 'new@devtrack.local',
      role: 'PROJECT_MANAGER',
      temporaryPassword: 'Temp1234',
    });

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/admin/users');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      fullName: 'New Person',
      email: 'new@devtrack.local',
      role: 'PROJECT_MANAGER',
      temporaryPassword: 'Temp1234',
    });
  });

  it('409 EMAIL_TAKEN says the email is used', async () => {
    fetchMock.mockResolvedValueOnce(reply(409, { code: 'EMAIL_TAKEN' }));

    const error = await errorOf(
      createUser({
        fullName: 'X',
        email: 'karim@devtrack.local',
        role: 'TEAM_MEMBER',
        temporaryPassword: 'Temp1234',
      }),
    );

    expect(error.kind).toBe('email-taken');
    expect(error.message).toBe('A user with this email already exists.');
  });
});

describe('updateUser', () => {
  it('patches only the given fields', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { id: '4' }));

    await updateUser('4', { isActive: false });

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/admin/users/4');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ isActive: false });
  });

  it.each([
    [422, 'CANNOT_CHANGE_SELF', 'self'],
    [404, 'NOT_FOUND', 'not-found'],
    [400, 'VALIDATION_FAILED', 'invalid'],
    [500, undefined, 'server'],
  ])('%i %s gives "%s"', async (status, code, kind) => {
    fetchMock.mockResolvedValueOnce(reply(status, { code }));

    expect((await errorOf(updateUser('1', { role: 'TEAM_MEMBER' }))).kind).toBe(
      kind,
    );
  });

  it('no network gives "server"', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network down'));

    expect((await errorOf(updateUser('1', { isActive: true }))).kind).toBe(
      'server',
    );
  });
});
