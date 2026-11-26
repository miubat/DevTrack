import { useEffect, useState } from 'react';
import {
  AdminUsersError,
  listUsers,
  type AdminUser,
  type UserPage,
} from '../api/admin-users.ts';
import { ROLE_LABELS } from '../auth/roles.ts';
import { useSession } from '../auth/useSession.ts';
import ActiveStatusDialog from '../components/ActiveStatusDialog.tsx';
import UserFormDialog from '../components/UserFormDialog.tsx';
import { pagerLabel } from '../users/rules.ts';

// SRS §5.3: lists take page and size, default 25.
const PAGE_SIZE = 25;
// Wait this long after the last key press before searching.
const SEARCH_DELAY_MS = 300;

type OpenDialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'status'; user: AdminUser }
  | null;

// The answer to one list request. "key" says which request it answers.
interface Loaded {
  key: string;
  data: UserPage | null;
  error: string;
}

// AGL-08.5 (FR-AUTH-02, SRS §5.4): the admin's user screen. Admin only: the
// route is guarded by RequireRole, and the API answers 403 to anyone else.
function UsersPage() {
  const { userId } = useSession();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  // Raised after a save, to load the list again.
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<OpenDialog>(null);

  // Search after a short pause in typing, from page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Load the list. An answer that arrives after the search or page changed
  // again is ignored, so typing fast never shows an old result.
  const key = `${query}\n${page}\n${version}`;
  useEffect(() => {
    let current = true;
    listUsers({ q: query, page, size: PAGE_SIZE }).then(
      (data) => {
        if (current) {
          setLoaded({ key, data, error: '' });
        }
      },
      (e: unknown) => {
        if (current) {
          setLoaded((prev) => ({
            key,
            data: prev?.data ?? null, // keep showing the last list
            error:
              e instanceof AdminUsersError
                ? e.message
                : 'Something went wrong. Please try again.',
          }));
        }
      },
    );
    return () => {
      current = false;
    };
  }, [key, query, page]);

  const loading = loaded?.key !== key;
  const data = loaded?.data ?? null;
  const error = loading ? '' : (loaded?.error ?? '');

  function saved(message: string) {
    setDialog(null);
    setNotice(message);
    setVersion((v) => v + 1);
  }

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="page users-page">
      <div className="page-header">
        <h1>Users</h1>
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            setNotice('');
            setDialog({ kind: 'create' });
          }}
        >
          New user
        </button>
      </div>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <label htmlFor="user-search" className="visually-hidden">
        Search users
      </label>
      <input
        id="user-search"
        type="search"
        className="search"
        placeholder="Search by name or email"
        value={search}
        maxLength={254}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <table className="table" aria-busy={loading}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((user) => {
            const isSelf = user.id === userId;
            return (
              <tr key={user.id}>
                <td>
                  {user.fullName}
                  {isSelf && <span className="muted"> (you)</span>}
                </td>
                <td>{user.email}</td>
                <td>{ROLE_LABELS[user.role]}</td>
                <td>
                  <span
                    className={
                      user.isActive
                        ? 'badge badge-active'
                        : 'badge badge-inactive'
                    }
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {user.mustResetPassword && (
                    <span className="badge badge-note">Temporary password</span>
                  )}
                </td>
                <td className="actions">
                  <button
                    type="button"
                    className="button button-small"
                    aria-label={`Edit ${user.fullName}`}
                    onClick={() => {
                      setNotice('');
                      setDialog({ kind: 'edit', user });
                    }}
                  >
                    Edit
                  </button>
                  {!isSelf && (
                    <button
                      type="button"
                      className="button button-small"
                      aria-label={`${user.isActive ? 'Deactivate' : 'Reactivate'} ${user.fullName}`}
                      onClick={() => {
                        setNotice('');
                        setDialog({ kind: 'status', user });
                      }}
                    >
                      {user.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!loading && data && data.items.length === 0 && (
        <p className="muted">
          {query ? `No users match "${query}".` : 'No users yet.'}
        </p>
      )}

      <div className="pager">
        <span>{pagerLabel(data?.total ?? null, loading, page, PAGE_SIZE)}</span>
        <button
          type="button"
          className="button button-small"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="button button-small"
          disabled={page >= pages || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {dialog?.kind === 'create' && (
        <UserFormDialog
          user={null}
          isSelf={false}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {dialog?.kind === 'edit' && (
        <UserFormDialog
          user={dialog.user}
          isSelf={dialog.user.id === userId}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {dialog?.kind === 'status' && (
        <ActiveStatusDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
    </main>
  );
}

export default UsersPage;
