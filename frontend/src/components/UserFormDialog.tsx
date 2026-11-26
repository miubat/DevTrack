import { useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  AdminUsersError,
  createUser,
  updateUser,
  type AdminUser,
} from '../api/admin-users.ts';
import { passwordProblem } from '../auth/password-rule.ts';
import { ALL_ROLES, ROLE_LABELS, type Role } from '../auth/roles.ts';
import {
  changedFields,
  emailProblem,
  fullNameProblem,
} from '../users/rules.ts';
import Dialog from './Dialog.tsx';

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
}

// The order of the fields on screen.
const FIELD_ORDER = ['fullName', 'email', 'password'] as const;

interface Props {
  // The user to edit, or null to create a new one.
  user: AdminUser | null;
  // The signed-in admin: cannot change their own role (AGL-08.2).
  isSelf: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

// Create a user (name, email, role, temporary password) or edit name and role.
function UserFormDialog({ user, isSelf, onClose, onSaved }: Props) {
  const editing = user !== null;
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? 'TEAM_MEMBER');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const roleChanged = editing && role !== user.role;
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Shows the field errors and moves focus to the first field that has one, so
  // a keyboard user lands on it and a screen reader reads its message.
  // flushSync: the message must be on screen before the field gets focus.
  function showFieldErrors(errors: FieldErrors) {
    flushSync(() => setFieldErrors(errors));
    const first = FIELD_ORDER.find((field) => errors[field]);
    const refs = { fullName: nameRef, email: emailRef, password: passwordRef };
    if (first) {
      refs[first].current?.focus();
    }
  }

  function validate(): FieldErrors {
    if (editing) {
      return { fullName: fullNameProblem(fullName) };
    }
    return {
      fullName: fullNameProblem(fullName),
      email: emailProblem(email),
      password: passwordProblem(password),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError('');
    const errors = validate();
    showFieldErrors(errors);
    if (errors.fullName || errors.email || errors.password) {
      return;
    }

    // Edit: send only what changed; nothing changed means nothing to save.
    const changes = editing ? changedFields(user, fullName, role) : {};
    if (editing && Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateUser(user.id, changes);
        onSaved(`${fullName.trim()} was updated.`);
      } else {
        await createUser({
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          temporaryPassword: password,
        });
        onSaved(
          `${fullName.trim()} was created. Give them the temporary password; they set their own at first sign-in.`,
        );
      }
    } catch (error) {
      setSaving(false);
      if (error instanceof AdminUsersError && error.kind === 'email-taken') {
        showFieldErrors({ email: error.message });
      } else if (
        error instanceof AdminUsersError &&
        error.kind === 'invalid' &&
        !editing
      ) {
        // The page checks name and password exactly like the server, so a
        // refused new user means the server did not accept the email.
        showFieldErrors({ email: 'Enter a valid email address.' });
      } else {
        setServerError(
          error instanceof AdminUsersError
            ? error.message
            : 'Something went wrong. Please try again.',
        );
      }
    }
  }

  return (
    <Dialog
      title={editing ? 'Edit user' : 'New user'}
      busy={saving}
      onClose={onClose}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <p className="form-error" role="alert">
            {serverError}
          </p>
        )}

        <label htmlFor="user-name">Full name</label>
        <input
          id="user-name"
          ref={nameRef}
          value={fullName}
          maxLength={200}
          onChange={(e) => {
            setFullName(e.target.value);
            setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          aria-invalid={Boolean(fieldErrors.fullName)}
          aria-describedby={
            fieldErrors.fullName ? 'user-name-error' : undefined
          }
        />
        {fieldErrors.fullName && (
          <p id="user-name-error" className="field-error">
            {fieldErrors.fullName}
          </p>
        )}

        <label htmlFor="user-email">Email</label>
        {editing ? (
          <input id="user-email" value={user.email} disabled />
        ) : (
          <input
            id="user-email"
            ref={emailRef}
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? 'user-email-error' : undefined
            }
          />
        )}
        {fieldErrors.email && (
          <p id="user-email-error" className="field-error">
            {fieldErrors.email}
          </p>
        )}

        <label htmlFor="user-role">Role</label>
        <select
          id="user-role"
          value={role}
          disabled={isSelf}
          onChange={(e) => setRole(e.target.value as Role)}
          aria-describedby={
            isSelf
              ? 'user-role-hint'
              : roleChanged
                ? 'user-role-note'
                : undefined
          }
        >
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {isSelf && (
          <p id="user-role-hint" className="field-hint">
            You cannot change your own role.
          </p>
        )}
        {roleChanged && (
          <p id="user-role-note" className="field-hint">
            Changing the role signs this user out. They sign in again with the
            new role.
          </p>
        )}

        {!editing && (
          <>
            <label htmlFor="user-password">Temporary password</label>
            <input
              id="user-password"
              ref={passwordRef}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? 'user-password-error'
                  : 'user-password-hint'
              }
            />
            {fieldErrors.password ? (
              <p id="user-password-error" className="field-error">
                {fieldErrors.password}
              </p>
            ) : (
              <p id="user-password-hint" className="field-hint">
                8 to 64 characters, with a letter (A-Z or a-z) and a digit. The
                user sets their own password at first sign-in.
              </p>
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              Show password
            </label>
          </>
        )}

        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : editing ? 'Save' : 'Create user'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default UserFormDialog;
