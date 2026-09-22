"use client";
import { useEffect, useRef, useState } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  /** Called with each valid value while typing, for a live preview. */
  onPreview?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  decimals?: number;
  /** Maps a typed value to what will be stored, for example wrapping degrees. */
  normalize?: (value: number) => number;
  /** A narrow input without a visible label, for toolbars. */
  compact?: boolean;
}

function formatNumber(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "";
}

/**
 * Number input that keeps a local draft while typing and commits on Enter,
 * on blur or when the field goes away. Only a draft the user actually
 * edited is committed, and an empty draft falls back to the current value,
 * so tabbing through fields never changes anything. With onPreview each
 * keystroke shows up on the canvas at once and the commit closes the step.
 */
export function NumberField({ label, value, onCommit, onPreview, min, max, step = 1, suffix, disabled, decimals = 0, normalize, compact }: NumberFieldProps) {
  const [draft, setDraft] = useState(() => formatNumber(value, decimals));
  const edited = useRef(false);
  const commitRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!edited.current) setDraft(formatNumber(value, decimals));
  }, [value, decimals]);

  /** Parses a draft into a clamped, normalised number, or null when it is not one. */
  const parse = (raw: string): number | null => {
    const trimmed = raw.trim();
    const parsed = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(parsed)) return null;
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return normalize ? normalize(next) : next;
  };

  const commit = () => {
    if (!edited.current) return;
    edited.current = false;
    const next = parse(draft);
    if (next === null) {
      setDraft(formatNumber(value, decimals));
      return;
    }
    // With a live preview the value is already on screen, so commit records it.
    if (onPreview || formatNumber(next, decimals) !== formatNumber(value, decimals)) onCommit(next);
    setDraft(formatNumber(next, decimals));
  };
  commitRef.current = commit;

  // Commit a pending draft if the field unmounts, for example when the selection changes.
  useEffect(() => () => commitRef.current(), []);

  return (
    <label className={compact ? "row" : "field"} style={compact ? { gap: 4 } : undefined} title={compact ? label : undefined}>
      {compact ? null : <span className="field__label">{label}</span>}
      <span className="row" style={{ gap: 4 }}>
        <input
          className={`input input--sm ${compact ? "input--compact" : ""}`}
          type="number"
          aria-label={compact ? `${label}${suffix ? ` ${suffix}` : ""}` : undefined}
          value={draft}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => {
            edited.current = true;
            setDraft(event.target.value);
            if (onPreview) {
              const next = parse(event.target.value);
              if (next !== null) onPreview(next);
            }
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
