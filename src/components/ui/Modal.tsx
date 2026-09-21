"use client";
import { useEffect, type ReactNode } from "react";
import { IconButton } from "./IconButton";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

/** Centred dialog with a backdrop. Escape and the backdrop close it. */
export function Modal({ open, title, onClose, children, width }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { maxWidth: width } : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="row row--between" style={{ marginBottom: 16 }}>
          <h2 className="modal__title" style={{ marginBottom: 0 }}>
            {title}
          </h2>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
