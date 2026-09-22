"use client";
import { Icon } from "../ui/Icon";

interface DropZoneProps {
  onPick: () => void;
}

/** The empty page: a big target that names the three ways to add pictures. */
export function DropZone({ onPick }: DropZoneProps) {
  return (
    <div className="drop-zone">
      <Icon name="upload" size={40} />
      <p className="drop-zone__title">Drop pictures here</p>
      <p className="muted">Paste them from the clipboard, or</p>
      <button type="button" className="btn btn--primary" onClick={onPick}>
        Choose pictures
      </button>
      <p className="small muted drop-zone__note">
        Several at once is fine. Everything runs in your browser and nothing is uploaded anywhere.
      </p>
    </div>
  );
}
