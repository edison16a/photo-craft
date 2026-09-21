"use client";
import { useEffect, useState } from "react";
import { Modal } from "./Modal";

interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  initialValue: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

/** Asks for one line of text, for example a new name. */
export function PromptDialog({ open, title, label, initialValue, confirmLabel = "Save", onSubmit, onCancel }: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <Modal open={open} title={title} onClose={onCancel} width={420}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="field">
          <span className="field__label">{label}</span>
          <input className="input" value={value} autoFocus onChange={(event) => setValue(event.target.value)} />
        </label>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
