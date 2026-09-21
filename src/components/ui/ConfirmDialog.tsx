"use client";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Yes or no question before something that cannot be undone. */
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} width={420}>
      <p className="muted" style={{ marginBottom: 20 }}>
        {message}
      </p>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={`btn ${danger ? "btn--danger" : "btn--primary"}`} onClick={onConfirm} autoFocus>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
