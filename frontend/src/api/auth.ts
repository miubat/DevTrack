// Login API call (FR-AUTH-01). Backend: POST /auth/login.

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
  return (await res.json()) as LoginResult;
}
