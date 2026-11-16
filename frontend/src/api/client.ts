// Authenticated API client (AGL-05.2, FR-AUTH-03).
// Use apiFetch for every protected API call. It:
// 1. adds "Authorization: Bearer <access token>",
// 2. on 401, refreshes the token once and retries,
// 3. if the session is over (401), clears the token and sends the user to /login.
//    A server error during refresh (500, network) does not log the user out.

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
  const refreshed = await refreshAccessToken();
  if (refreshed === 'error') {
    return res; // server problem, not a logout: the page can show an error
  }
  if (refreshed === 'ok') {
    const retry = await send(path, init);
    if (retry.status !== 401) {
      return retry;
    }
  }

  setAccessToken(null);
  redirectToLogin();
  return res;
}
