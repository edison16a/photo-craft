"use client";
import { Modal } from "../../ui/Modal";

interface LeaveDialogProps {
  open: boolean;
  onSaveAndLeave: () => void;
  onLeave: () => void;
  onCancel: () => void;
}

/** Asked when leaving the editor with unsaved changes and autosave off. */
export function LeaveDialog({ open, onSaveAndLeave, onLeave, onCancel }: LeaveDialogProps) {
  return (
    <Modal open={open} title="Unsaved changes" onClose={onCancel} width={440}>
      <p className="muted" style={{ marginBottom: 20 }}>
        This project has changes that are not saved yet. Save them before you go back to your projects?
      </p>
      <div className="row row--wrap" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn--danger" onClick={onLeave}>
          Leave without saving
        </button>
        <button type="button" className="btn btn--primary" onClick={onSaveAndLeave} autoFocus>
          Save and leave
        </button>
      </div>
    </Modal>
  );
}
