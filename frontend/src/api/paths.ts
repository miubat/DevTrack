// Where the backend API lives. Every API helper builds its URLs with apiPath, so
// moving the API (AGL-08.8: SRS §5.3 base path /api/v1) changes only API_BASE.
export const API_BASE = '';

export function apiPath(path: string): string {
  return `${API_BASE}${path}`;
}
