// Login, refresh and logout API calls (FR-AUTH-01, FR-AUTH-03).
// Backend: POST /auth/login, POST /auth/refresh, POST /auth/logout.

import { setAccessToken } from './token.ts';

export interface LoginUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  mustResetPassword: boolean;
}

export interface LoginResult {
  user: LoginUser;
  accessToken: string;
}

// invalid: wrong email or password (same text for both, so we never say which)
// rate-limited: too many login requests from this address (429 RATE_LIMITED)
// locked: too many failed logins for this account (429 TEMPORARILY_LOCKED)
// server: anything else, or the backend cannot be reached
export type LoginErrorKind = 'invalid' | 'rate-limited' | 'locked' | 'server';

// The message the user sees.
export class LoginError extends Error {
  readonly kind: LoginErrorKind;

  constructor(kind: LoginErrorKind) {
    super(loginErrorMessage(kind));
    this.kind = kind;
  }
}

// The 429 messages never show a time: it would tell an attacker exactly when
// the limit or the lock ends and when to start guessing again.
function loginErrorMessage(kind: LoginErrorKind): string {
  switch (kind) {
    case 'invalid':
      return 'Invalid email or password.';
    case 'rate-limited':
      return 'Too many login attempts. Please try again later.';
    case 'locked':
      return 'Too many failed logins. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Reads the 429 answer: which limit was hit.
async function tooManyRequests(res: Response): Promise<LoginError> {
  const body = (await res.json().catch(() => ({}))) as { code?: string };
  return new LoginError(
    body.code === 'TEMPORARILY_LOCKED' ? 'locked' : 'rate-limited',
  );
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // keep the refresh-token cookie
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new LoginError('server'); // network down or backend not running
  }

  if (res.status === 400 || res.status === 401) {
    throw new LoginError('invalid');
  }
  if (res.status === 429) {
    throw await tooManyRequests(res); // BUG-AGL-05.1-03 and 05.1-04
  }
  if (!res.ok) {
    throw new LoginError('server');
  }
  const result = (await res.json()) as LoginResult;
  setAccessToken(result.accessToken ?? null);
  return result;
}

// Only one refresh at a time. The server rotates the refresh cookie, so two
// parallel refresh calls would send the same old cookie and the second gets 401.
let refreshing: Promise<RefreshResult> | null = null;

// ok: new access token saved
// expired: the server said 401, so the session is over
// error: server error or network down; the session may still be fine, so keep it
export type RefreshResult = 'ok' | 'expired' | 'error';

// Gets a new access token with the refresh cookie.
export function refreshAccessToken(): Promise<RefreshResult> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function doRefresh(): Promise<RefreshResult> {
  try {
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.status === 401) {
      setAccessToken(null); // only a 401 ends the session
      return 'expired';
    }
    if (!res.ok) {
      return 'error';
    }
    const body = (await res.json()) as { accessToken: string };
    setAccessToken(body.accessToken);
    return 'ok';
  } catch {
    return 'error'; // network down
  }
}

// Ends the session: the server revokes the refresh token and clears the cookie.
// The app forgets the access token even if the server cannot be reached, so the
// user is always signed out on this device.
export async function logout(): Promise<void> {
  try {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    // network down: still sign out here
  }
  setAccessToken(null);
}
