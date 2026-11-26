import { NavLink } from 'react-router';
import { menusFor } from '../auth/roles.ts';
import { useSession } from '../auth/useSession.ts';
import UserMenu from './UserMenu.tsx';

// Top menu: each role sees only its own menus (SRS §1.3).
function NavBar() {
  const { role, name, mustResetPassword } = useSession();
  // No menus until the temporary password is replaced (AGL-08.4).
  const items = mustResetPassword ? [] : menusFor(role);

  return (
    <header className="navbar">
      <NavLink to="/" className="navbar-brand">
        DevTrack
      </NavLink>
      {items.length > 0 && (
        <nav aria-label="Main">
          {items.map((item) => (
            <NavLink key={item.path} to={item.path}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
      {role ? (
        // Also shown on the set-new-password page, so the user can sign out there.
        <UserMenu name={name} role={role} />
      ) : (
        <NavLink to="/login" className="navbar-login">
          Sign in
        </NavLink>
      )}
    </header>
  );
}

export default NavBar;
