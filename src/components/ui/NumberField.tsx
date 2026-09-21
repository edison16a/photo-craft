"use client";
import { useEffect, useState } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  decimals?: number;
}

/**
 * Number input that keeps a local draft while typing and commits on Enter
 * or blur. This keeps undo history to one step per edit.
 */
export function NumberField({ label, value, onCommit, min, max, step = 1, suffix, disabled, decimals = 0 }: NumberFieldProps) {
  const format = (n: number) => (Number.isFinite(n) ? n.toFixed(decimals) : "");
  const [draft, setDraft] = useState(format(value));

  useEffect(() => {
    setDraft(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(format(value));
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (next !== value) onCommit(next);
    setDraft(format(next));
  };

  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="row" style={{ gap: 4 }}>
        <input
          className="input input--sm"
          type="number"
          value={draft}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") (event.target as HTMLInputElement).blur();
          }}
        />
        {suffix ? <span className="small muted">{suffix}</span> : null}
      </span>
    </label>
  );
}
