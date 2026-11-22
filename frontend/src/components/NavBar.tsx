import { NavLink } from 'react-router';
import { menusFor } from '../auth/roles.ts';
import { useSession } from '../auth/useSession.ts';

// Top menu: each role sees only its own menus (SRS §1.3).
function NavBar() {
  const { role } = useSession();
  const items = menusFor(role);

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
      {!role && (
        <NavLink to="/login" className="navbar-login">
          Sign in
        </NavLink>
      )}
    </header>
  );
}

export default NavBar;
