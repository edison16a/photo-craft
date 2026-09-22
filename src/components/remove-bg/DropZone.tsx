"use client";
import { Icon } from "../ui/Icon";

interface DropZoneProps {
  onPick: () => void;
}

/** The empty page: a big target that names the ways to add pictures. */
export function DropZone({ onPick }: DropZoneProps) {
  return (
    <div className="drop-zone">
      <Icon name="upload" size={40} />
      <p className="drop-zone__title">Drop pictures here</p>
      <p className="muted">Paste them from the clipboard, or</p>
      <button type="button" className="btn btn--primary" onClick={onPick}>
        Choose pictures
      </button>
    </div>
  );
}
