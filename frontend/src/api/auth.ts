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

// The message the user sees. "invalid" is always the same generic text,
// so we never say whether the email or the password was wrong.
export class LoginError extends Error {
  readonly kind: 'invalid' | 'server';

  constructor(kind: 'invalid' | 'server') {
    super(
      kind === 'invalid'
        ? 'Invalid email or password.'
        : 'Something went wrong. Please try again.',
    );
    this.kind = kind;
  }
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
  if (!res.ok) {
    throw new LoginError('server');
  }
  const result = (await res.json()) as LoginResult;
  setAccessToken(result.accessToken ?? null);
  return result;
}

// Only one refresh at a time. The server rotates the refresh cookie, so two
// parallel refresh calls would send the same old cookie and the second gets 401.
let refreshing: Promise<boolean> | null = null;

// Gets a new access token with the refresh cookie. Returns false if the session is over.
export function refreshAccessToken(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      setAccessToken(null);
      return false;
    }
    const body = (await res.json()) as { accessToken: string };
    setAccessToken(body.accessToken);
    return true;
  } catch {
    setAccessToken(null); // network down: treat as logged out
    return false;
  }
}
