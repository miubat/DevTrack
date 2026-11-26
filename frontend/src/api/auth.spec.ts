import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { login, LoginError, logout } from './auth.ts';
import { getAccessToken, setAccessToken } from './token.ts';

const fetchMock = vi.fn();

function reply(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

// Runs login and returns the LoginError it throws.
async function loginError(): Promise<LoginError> {
  const error = await login('karim@devtrack.local', 'x').catch((e) => e);
  expect(error).toBeInstanceOf(LoginError);
  return error as LoginError;
}

beforeEach(() => {
  setAccessToken(null);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('login errors', () => {
  it('401 shows the generic invalid message', async () => {
    fetchMock.mockResolvedValueOnce(reply(401));

    const error = await loginError();

    expect(error.kind).toBe('invalid');
    expect(error.message).toBe('Invalid email or password.');
  });

  // BUG-AGL-05.1-04: a general message, never the exact time the limit ends.
  it('429 RATE_LIMITED asks the user to try again later, without a time', async () => {
    fetchMock.mockResolvedValueOnce(
      reply(429, { code: 'RATE_LIMITED' }, { 'Retry-After': '45' }),
    );

    const error = await loginError();

    expect(error.kind).toBe('rate-limited');
    expect(error.message).toBe(
      'Too many login attempts. Please try again later.',
    );
    expect(error.message).not.toMatch(/\d/); // no minutes or seconds
  });

  // BUG-AGL-05.1-03: a general message, never the exact time the lock ends.
  it('429 TEMPORARILY_LOCKED asks the user to try again later, without a time', async () => {
    fetchMock.mockResolvedValueOnce(
      reply(429, { code: 'TEMPORARILY_LOCKED' }, { 'Retry-After': '894' }),
    );

    const error = await loginError();

    expect(error.kind).toBe('locked');
    expect(error.message).toBe(
      'Too many failed logins. Please try again later.',
    );
    expect(error.message).not.toMatch(/\d/); // no minutes or seconds
  });

  it('429 is never shown as "Something went wrong"', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not json', { status: 429 }));

    const error = await loginError();

    expect(error.kind).toBe('rate-limited');
    expect(error.message).not.toContain('Something went wrong');
  });

  it('500 still shows the general server message', async () => {
    fetchMock.mockResolvedValueOnce(reply(500));

    const error = await loginError();

    expect(error.kind).toBe('server');
    expect(error.message).toBe('Something went wrong. Please try again.');
  });
});

describe('logout', () => {
  it('calls the server with the cookie and forgets the access token', async () => {
    setAccessToken('some-token');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await logout();

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/auth/logout');
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(getAccessToken()).toBeNull();
  });

  it('still signs out on this device when the server cannot be reached', async () => {
    setAccessToken('some-token');
    fetchMock.mockRejectedValueOnce(new TypeError('network down'));

    await logout();

    expect(getAccessToken()).toBeNull();
  });
});
