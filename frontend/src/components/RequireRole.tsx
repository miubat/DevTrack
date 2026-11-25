import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { FromState } from '../auth/redirect.ts';
import type { Role } from '../auth/roles.ts';
import { useSession } from '../auth/useSession.ts';

interface Props {
  roles: Role[];
  children: ReactNode;
}

// Page guard: not logged in → /login, wrong role → /no-access.
function RequireRole({ roles, children }: Props) {
  const { role, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return <p className="page">Loading...</p>;
  }
  if (!role) {
    // Remember this page, so login can send the user back (BUG-AGL-05.3-01).
    const state: FromState = {
      from: location.pathname + location.search + location.hash,
    };
    return <Navigate to="/login" replace state={state} />;
  }
  if (!roles.includes(role)) {
    return <Navigate to="/no-access" replace />;
  }
  return children;
}

export default RequireRole;
