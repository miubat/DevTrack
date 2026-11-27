import type { Response } from 'express';
import type { SessionTokens } from './session.service.js';

export const REFRESH_COOKIE = 'refresh_token';

// The refresh token cookie, set by login, refresh and the password change.
export function setRefreshCookie(res: Response, tokens: SessionTokens): void {
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth',
    expires: tokens.refreshExpiresAt,
  });
}
