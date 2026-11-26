import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  // True while a save is running: Escape then does nothing, so the result of
  // the save is always shown in the dialog.
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}

// A modal dialog on top of the page. Uses the browser's <dialog>, which keeps
// keyboard focus inside and closes on Escape. When it closes, focus goes back
// to the button that opened it, so keyboard users keep their place.
function Dialog({ title, busy = false, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      dialog?.close();
      // React has already removed the dialog, so the browser cannot put focus
      // back by itself.
      if (opener?.isConnected) {
        opener.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault(); // Escape: let the page decide
        if (!busy) {
          onClose();
        }
      }}
    >
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}

export default Dialog;
