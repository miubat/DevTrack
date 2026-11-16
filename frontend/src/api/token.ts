// Access token storage (AGL-05.2).
// Kept in memory only, not localStorage, so a malicious script (XSS) cannot read it later.
// After a page reload it is gone; the API client gets a new one with the refresh cookie.

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
