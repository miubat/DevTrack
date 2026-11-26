import { useState } from 'react';
import {
  AdminUsersError,
  updateUser,
  type AdminUser,
} from '../api/admin-users.ts';
import Dialog from './Dialog.tsx';

interface Props {
  user: AdminUser;
  onClose: () => void;
  onSaved: (message: string) => void;
}

// Confirms deactivating or reactivating a user (FR-AUTH-02).
function ActiveStatusDialog({ user, onClose, onSaved }: Props) {
  const deactivate = user.isActive;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setSaving(true);
    setError('');
    try {
      await updateUser(user.id, { isActive: !deactivate });
      onSaved(
        deactivate
          ? `${user.fullName} was deactivated.`
          : `${user.fullName} was reactivated.`,
      );
    } catch (e) {
      setError(
        e instanceof AdminUsersError
          ? e.message
          : 'Something went wrong. Please try again.',
      );
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={deactivate ? 'Deactivate user?' : 'Reactivate user?'}
      busy={saving}
      onClose={onClose}
    >
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {deactivate ? (
        <p>
          <strong>{user.fullName}</strong> is signed out at once and cannot sign
          in until reactivated. Their issues, comments and history keep their
          name.
        </p>
      ) : (
        <p>
          <strong>{user.fullName}</strong> can sign in again.
        </p>
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
          type="button"
          className={
            deactivate ? 'button button-danger' : 'button button-primary'
          }
          onClick={() => void confirm()}
          disabled={saving}
        >
          {saving ? 'Saving...' : deactivate ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>
    </Dialog>
  );
}

export default ActiveStatusDialog;
