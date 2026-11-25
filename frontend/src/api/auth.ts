// Login and refresh API calls (FR-AUTH-01, FR-AUTH-03).
// Backend: POST /auth/login, POST /auth/refresh.

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

  // waitSeconds comes from the Retry-After header (429 only).
  constructor(kind: LoginErrorKind, waitSeconds?: number) {
    super(loginErrorMessage(kind, waitSeconds));
    this.kind = kind;
  }
}

function loginErrorMessage(kind: LoginErrorKind, waitSeconds?: number): string {
  switch (kind) {
    case 'invalid':
      return 'Invalid email or password.';
    case 'rate-limited':
      return `Too many login attempts. Please wait ${waitText(waitSeconds ?? 60)} and try again.`;
    case 'locked':
      return `Too many failed logins. Please wait ${waitText(waitSeconds ?? 15 * 60)} and try again.`;
    default:
      return 'Something went wrong. Please try again.';
  }
}

// 45 -> "1 minute", 894 -> "15 minutes" (always rounded up)
function waitText(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

// Reads the 429 answer: which limit was hit, and how long to wait.
async function tooManyRequests(res: Response): Promise<LoginError> {
  const body = (await res.json().catch(() => ({}))) as { code?: string };
  const retryAfter = Number(res.headers.get('Retry-After'));
  const waitSeconds = retryAfter > 0 ? retryAfter : undefined;
  return new LoginError(
    body.code === 'TEMPORARILY_LOCKED' ? 'locked' : 'rate-limited',
    waitSeconds,
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
