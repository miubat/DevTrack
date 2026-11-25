// Where to send the user after login (BUG-AGL-05.3-01).
// RequireRole saves the page the user asked for in the router state as `from`.

export interface FromState {
  from?: string;
}

// Returns the saved page, or "/" when there is none or it is not safe.
// Safe means one of our own pages: it starts with a single "/" (so not
// "//other-site.com" or "/\other-site.com"), and it is not the login page itself.
export function returnPath(state: unknown): string {
  const from = (state as FromState | null)?.from;
  if (
    typeof from !== 'string' ||
    !from.startsWith('/') ||
    from.startsWith('//') ||
    from.startsWith('/\\') ||
    from.startsWith('/login')
  ) {
    return '/';
  }
  return from;
}
