"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./IconButton";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

/**
 * Centred dialog with a backdrop. Escape and the backdrop close it. The
 * dialog takes focus when it opens, and editor shortcuts stay quiet while
 * an element with aria-modal is on the page.
 */
export function Modal({ open, title, onClose, children, width }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
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
