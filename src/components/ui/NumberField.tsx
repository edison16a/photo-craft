"use client";
import { useEffect, useRef, useState } from "react";

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
  /** Maps a typed value to what will be stored, for example wrapping degrees. */
  normalize?: (value: number) => number;
}

function formatNumber(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "";
}

/**
 * Number input that keeps a local draft while typing and commits on Enter,
 * on blur or when the field goes away. Only a draft the user actually
 * edited is committed, and an empty draft falls back to the current value,
 * so tabbing through fields never changes anything.
 */
export function NumberField({ label, value, onCommit, min, max, step = 1, suffix, disabled, decimals = 0, normalize }: NumberFieldProps) {
  const [draft, setDraft] = useState(() => formatNumber(value, decimals));
  const edited = useRef(false);
  const commitRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!edited.current) setDraft(formatNumber(value, decimals));
  }, [value, decimals]);

  const commit = () => {
    if (!edited.current) return;
    edited.current = false;
    const raw = draft.trim();
    const parsed = Number(raw);
    if (raw === "" || !Number.isFinite(parsed)) {
      setDraft(formatNumber(value, decimals));
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (normalize) next = normalize(next);
    if (formatNumber(next, decimals) !== formatNumber(value, decimals)) onCommit(next);
    setDraft(formatNumber(next, decimals));
  };
  commitRef.current = commit;

  // Commit a pending draft if the field unmounts, for example when the selection changes.
  useEffect(() => () => commitRef.current(), []);

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
          onChange={(event) => {
            edited.current = true;
            setDraft(event.target.value);
          }}
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
