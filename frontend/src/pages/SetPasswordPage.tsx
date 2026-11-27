import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { changePassword, ChangePasswordError } from '../api/me.ts';
import { passwordProblem } from '../auth/password-rule.ts';
import { useSession } from '../auth/useSession.ts';

interface FieldErrors {
  current?: string;
  next?: string;
  confirm?: string;
}

// Check the fields before calling the server.
function validate(current: string, next: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!current) {
    errors.current = 'Temporary password is required.';
  }
  errors.next = passwordProblem(next);
  if (!errors.next && next === current) {
    errors.next = 'Choose a password different from the temporary one.';
  }
  if (confirm !== next) {
    errors.confirm = 'The passwords do not match.';
  }
  return errors;
}

// AGL-08.4 (FR-AUTH-02): a user created by an admin sets a new password at first login.
function SetPasswordPage() {
  const navigate = useNavigate();
  const { role, mustResetPassword, loading } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <p className="page">Loading...</p>;
  }
  if (!role) {
    return <Navigate to="/login" replace />;
  }
  // Only for a temporary password. Changing it later belongs to the profile page.
  if (!mustResetPassword && !submitting) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError('');

    const errors = validate(current, next, confirm);
    setFieldErrors(errors);
    if (errors.current || errors.next || errors.confirm) {
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(current, next);
      navigate('/', { replace: true });
    } catch (error) {
      if (
        error instanceof ChangePasswordError &&
        error.kind === 'current-wrong'
      ) {
        setFieldErrors({ current: error.message });
        setCurrent('');
      } else if (
        error instanceof ChangePasswordError &&
        error.kind === 'invalid'
      ) {
        setFieldErrors({ next: error.message }); // shown under "New password"
      } else {
        setServerError(
          error instanceof ChangePasswordError
            ? error.message
            : 'Something went wrong. Please try again.',
        );
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="page login-page">
      <h1>Set a new password</h1>
      <p>
        Your account has a temporary password. Choose your own password to start
        using DevTrack.
      </p>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <p className="form-error" role="alert">
            {serverError}
          </p>
        )}

        <label htmlFor="current-password">Temporary password</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setFieldErrors((prev) => ({ ...prev, current: undefined }));
          }}
          aria-invalid={Boolean(fieldErrors.current)}
          aria-describedby={fieldErrors.current ? 'current-error' : undefined}
        />
        {fieldErrors.current && (
          <p id="current-error" className="field-error">
            {fieldErrors.current}
          </p>
        )}

        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => {
            setNext(e.target.value);
            setFieldErrors((prev) => ({ ...prev, next: undefined }));
          }}
          aria-invalid={Boolean(fieldErrors.next)}
          aria-describedby={fieldErrors.next ? 'new-error' : 'new-hint'}
        />
        {fieldErrors.next ? (
          <p id="new-error" className="field-error">
            {fieldErrors.next}
          </p>
        ) : (
          <p id="new-hint" className="field-hint">
            8 to 64 characters, with a letter (A-Z or a-z) and a digit.
          </p>
        )}

        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
          }}
          aria-invalid={Boolean(fieldErrors.confirm)}
          aria-describedby={fieldErrors.confirm ? 'confirm-error' : undefined}
        />
        {fieldErrors.confirm && (
          <p id="confirm-error" className="field-error">
            {fieldErrors.confirm}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Set password'}
        </button>
      </form>
    </main>
  );
}

export default SetPasswordPage;
