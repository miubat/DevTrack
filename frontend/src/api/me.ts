// The signed-in user's own account (SRS 5.3: /me).
// AGL-08.4: POST /me/password replaces the temporary password at first login.

import { apiFetch } from './client.ts';
import { setAccessToken } from './token.ts';

// current-wrong: the current (temporary) password is wrong (400 CURRENT_PASSWORD_WRONG)
// invalid: the server refused the new password (400 VALIDATION_FAILED); the
//   message is plain text for the user, not the server's field-name message
// server: anything else, or the backend cannot be reached
export type ChangePasswordErrorKind = 'current-wrong' | 'invalid' | 'server';

export class ChangePasswordError extends Error {
  readonly kind: ChangePasswordErrorKind;

  constructor(kind: ChangePasswordErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  let res: Response;
  try {
    res = await apiFetch('/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // the server sends a new refresh cookie
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch {
    throw new ChangePasswordError(
      'server',
      'Something went wrong. Please try again.',
    );
  }

  if (res.status === 400) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string | string[];
    };
    if (body.code === 'CURRENT_PASSWORD_WRONG') {
      throw new ChangePasswordError(
        'current-wrong',
        'The temporary password is wrong.',
      );
    }
    const messages = Array.isArray(body.message)
      ? body.message
      : [body.message ?? ''];
    throw new ChangePasswordError(
      'invalid',
      messages.some((m) => m.includes('different'))
        ? 'Choose a password different from the temporary one.'
        : 'Use 8 to 64 characters, with a letter (A-Z or a-z) and a digit.',
    );
  }
  if (!res.ok) {
    throw new ChangePasswordError(
      'server',
      'Something went wrong. Please try again.',
    );
  }
  // The new token no longer says "must reset", so the app opens normally.
  const body = (await res.json()) as { accessToken: string };
  setAccessToken(body.accessToken);
}
