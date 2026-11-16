// Authenticated API client (AGL-05.2, FR-AUTH-03).
// Use apiFetch for every protected API call. It:
// 1. adds "Authorization: Bearer <access token>",
// 2. on 401, refreshes the token once and retries,
// 3. if it still fails, clears the token and sends the user to /login.

import { refreshAccessToken } from './auth.ts';
import { getAccessToken, setAccessToken } from './token.ts';

function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(path, { ...init, headers });
}

function redirectToLogin(): void {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await send(path, init);
  if (res.status !== 401) {
    return res;
  }

  // Token missing or expired (15 min): try one refresh, then retry once.
  if (await refreshAccessToken()) {
    const retry = await send(path, init);
    if (retry.status !== 401) {
      return retry;
    }
  }

  setAccessToken(null);
  redirectToLogin();
  return res;
}
