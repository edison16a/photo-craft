"use client";
import { useEffect, useState } from "react";

interface OpacitySliderProps {
  /** 0 to 1. */
  value: number;
  onCommit: (value: number) => void;
}

/**
 * Opacity slider that follows the pointer while dragging and stores the
 * result once, when the drag ends, so a drag is a single undo step.
 */
export function OpacitySlider({ value, onCommit }: OpacitySliderProps) {
  const [draft, setDraft] = useState(Math.round(value * 100));

  useEffect(() => setDraft(Math.round(value * 100)), [value]);

  const commit = () => {
    if (draft !== Math.round(value * 100)) onCommit(draft / 100);
  };

  return (
    <label className="field">
      <span className="field__label">Opacity {draft}%</span>
      <input
        type="range"
        className="slider"
        min={0}
        max={100}
        value={draft}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </label>
  );
}
