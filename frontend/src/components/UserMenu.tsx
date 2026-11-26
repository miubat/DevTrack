import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { logout } from '../api/auth.ts';
import type { Role } from '../auth/roles.ts';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  TEAM_MEMBER: 'Team Member',
};

// "Karim Hossain" → "KH"
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? [parts[0], parts.at(-1)!] : parts;
  return letters.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

interface Props {
  name: string | null;
  role: Role;
}

// Top-right user menu: who is signed in, and Sign out.
function UserMenu({ name, role }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const shownName = name ?? ROLE_LABELS[role];

  // Close on a click outside the menu or on Escape.
  useEffect(() => {
    if (!open) {
      return;
    }
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    await logout();
    setOpen(false);
    setSigningOut(false);
    navigate('/login', { replace: true });
  }

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${shownName}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-menu-avatar" aria-hidden="true">
          {initials(shownName)}
        </span>
        <span className="user-menu-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="user-menu-panel">
          {/* Who is signed in: shown above the menu, not a menu item */}
          <div className="user-menu-who">
            <strong>{shownName}</strong>
            <span>{ROLE_LABELS[role]}</span>
          </div>
          <div role="menu" aria-label="Account">
            <button
              type="button"
              role="menuitem"
              className="user-menu-item"
              onClick={() => void signOut()}
              disabled={signingOut}
            >
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
