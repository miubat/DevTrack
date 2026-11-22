// Access token storage (AGL-05.2).
// Kept in memory only, not localStorage, so a malicious script (XSS) cannot read it later.
// After a page reload it is gone; the API client gets a new one with the refresh cookie.

let accessToken: string | null = null;

// Screens that must redraw when the token changes (AGL-05.3: menus)
const listeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener());
}

export function subscribeToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
