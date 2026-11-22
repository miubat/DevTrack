import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import type { Role } from '../auth/roles.ts';
import { useSession } from '../auth/useSession.ts';

interface Props {
  roles: Role[];
  children: ReactNode;
}

// Page guard: not logged in → /login, wrong role → /no-access.
function RequireRole({ roles, children }: Props) {
  const { role, loading } = useSession();

  if (loading) {
    return <p className="page">Loading...</p>;
  }
  if (!role) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(role)) {
    return <Navigate to="/no-access" replace />;
  }
  return children;
}

export default RequireRole;
