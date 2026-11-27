import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '../auth/useSession.ts';

export const SET_PASSWORD_PATH = '/set-password';

// AGL-08.4: while the user has a temporary password, every page opens the
// set-new-password page instead. The backend refuses the API too (403).
function PasswordChangeGate({ children }: { children: ReactNode }) {
  const { mustResetPassword } = useSession();
  const { pathname } = useLocation();

  if (mustResetPassword && pathname !== SET_PASSWORD_PATH) {
    return <Navigate to={SET_PASSWORD_PATH} replace />;
  }
  return children;
}

export default PasswordChangeGate;
