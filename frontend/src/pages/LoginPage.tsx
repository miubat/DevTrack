import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { login, LoginError } from '../api/auth.ts';
import { returnPath } from '../auth/redirect.ts';
import { useSession } from '../auth/useSession.ts';

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Check the fields before calling the server.
function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  }
  return errors;
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { role, loading } = useSession();
  // The page to open after login: the one the user asked for, or "/".
  const target = returnPath(useLocation().state);

  // Wait while a reload restores the session, so the form does not flash.
  if (loading) {
    return <p className="page">Loading...</p>;
  }
  // Already logged in: do not show the form again (BUG-AGL-05.1-02).
  if (role) {
    return <Navigate to={target} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError('');

    const errors = validate(email, password);
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // Back to the page the user asked for (BUG-AGL-05.3-01).
      navigate(target, { replace: true });
    } catch (error) {
      setServerError(
        error instanceof LoginError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page login-page">
      <h1>Sign in to DevTrack</h1>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <p className="form-error" role="alert">
            {serverError}
          </p>
        )}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldErrors((prev) => ({ ...prev, email: undefined })); // hide old error while typing
          }}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
        />
        {fieldErrors.email && (
          <p id="email-error" className="field-error">
            {fieldErrors.email}
          </p>
        )}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((prev) => ({ ...prev, password: undefined })); // hide old error while typing
          }}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
        />
        {fieldErrors.password && (
          <p id="password-error" className="field-error">
            {fieldErrors.password}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

export default LoginPage;
