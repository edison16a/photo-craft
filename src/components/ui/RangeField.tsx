"use client";
import { useEffect, useState } from "react";

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onCommit: (value: number) => void;
  /** Shows each position on the canvas while dragging. */
  onPreview?: (value: number) => void;
}

/**
 * A labelled slider that shows its value, updates the canvas while it is
 * dragged and records the whole drag as one undo step when it ends.
 */
export function RangeField({ label, value, min, max, step = 1, suffix = "", onCommit, onPreview }: RangeFieldProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (onPreview || draft !== value) onCommit(draft);
  };

  return (
    <label className="field">
      <span className="field__label">
        {label} {Math.round(draft)}
        {suffix}
      </span>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => {
          const next = Number(event.target.value);
          setDraft(next);
          onPreview?.(next);
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </label>
  );
}
