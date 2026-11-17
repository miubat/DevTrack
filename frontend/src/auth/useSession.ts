import { useEffect, useState, useSyncExternalStore } from 'react';
import { refreshAccessToken } from '../api/auth.ts';
import { getAccessToken, subscribeToken } from '../api/token.ts';
import { roleFromToken, type Role } from './roles.ts';

export interface Session {
  role: Role | null;
  // true while we are still trying to restore the session after a page reload
  loading: boolean;
}

// Current user's role. Redraws when the token changes (login, refresh, logout).
// After a reload the token is gone, so it tries the refresh cookie once.
export function useSession(): Session {
  const token = useSyncExternalStore(subscribeToken, getAccessToken);
  const [restoring, setRestoring] = useState(token === null);

  useEffect(() => {
    if (token) {
      return;
    }
    let active = true;
    void refreshAccessToken().finally(() => {
      if (active) {
        setRestoring(false);
      }
    });
    return () => {
      active = false;
    };
  }, [token]);

  return { role: roleFromToken(token), loading: !token && restoring };
}
