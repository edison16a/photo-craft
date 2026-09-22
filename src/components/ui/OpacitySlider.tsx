"use client";
import { useEffect, useState } from "react";

interface OpacitySliderProps {
  /** 0 to 1. */
  value: number;
  onCommit: (value: number) => void;
  /** Shows each position on the canvas while dragging. */
  onPreview?: (value: number) => void;
}

/**
 * Opacity slider that updates the canvas while dragging and records the
 * whole drag as a single undo step when it ends.
 */
export function OpacitySlider({ value, onCommit, onPreview }: OpacitySliderProps) {
  const [draft, setDraft] = useState(Math.round(value * 100));

  useEffect(() => setDraft(Math.round(value * 100)), [value]);

  const commit = () => {
    if (onPreview || draft !== Math.round(value * 100)) onCommit(draft / 100);
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
        onChange={(event) => {
          const next = Number(event.target.value);
          setDraft(next);
          onPreview?.(next / 100);
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </label>
  );
}
