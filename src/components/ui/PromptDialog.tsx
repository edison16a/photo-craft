"use client";
import { useState } from "react";
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

/**
 * Asks for one line of text, for example a new name. The form is keyed on
 * the initial value so it mounts already filled in, with no empty flash.
 */
export function PromptDialog({ open, title, label, initialValue, confirmLabel = "Save", onSubmit, onCancel }: PromptDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} width={420}>
      <PromptForm key={initialValue} label={label} initialValue={initialValue} confirmLabel={confirmLabel} onSubmit={onSubmit} onCancel={onCancel} />
    </Modal>
  );
}

interface PromptFormProps {
  label: string;
  initialValue: string;
  confirmLabel: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

function PromptForm({ label, initialValue, confirmLabel, onSubmit, onCancel }: PromptFormProps) {
  const [value, setValue] = useState(initialValue);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
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
  );
}
