"use client";
/**
 * Colour picker: a swatch button that opens a popover with quick colours,
 * a grid of three hundred swatches, a hex field and the browser's own
 * colour dialog for anything else.
 */
import { useEffect, useRef, useState } from "react";
import { NativeColorInput } from "./NativeColorInput";
import { COLOR_PALETTE, PALETTE_COLUMNS, QUICK_COLORS, isValidHex, normalizeHex } from "@/data/colors";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  /** Show a "None" option that sets the colour to "transparent". */
  allowTransparent?: boolean;
}

export function ColorPicker({ label, value, onChange, allowTransparent }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => setHexDraft(value), [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const isTransparent = value === "transparent";
  const commitHex = () => {
    const raw = hexDraft.trim();
    const candidate = raw.startsWith("#") ? raw : `#${raw}`;
    if (!isValidHex(candidate)) {
      setHexDraft(value);
      return;
    }
    const hex = normalizeHex(candidate);
    if (hex !== value) onChange(hex);
    setHexDraft(hex);
  };

  return (
    <div className="field color-field" ref={anchorRef}>
      <span className="field__label">{label}</span>
      <button
        type="button"
        className={`color-preview ${isTransparent ? "color-preview--none" : ""}`}
        style={{ background: isTransparent ? undefined : value }}
        title={value}
        aria-label={`${label}: ${value}`}
        onClick={() => setOpen((v) => !v)}
      />
      {open ? (
        <div className="color-popover stack" role="dialog" aria-label={`${label} colours`}>
          <div className="color-grid">
            {QUICK_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`color-swatch ${value === hex ? "color-swatch--active" : ""}`}
                style={{ background: hex }}
                title={hex}
                onClick={() => onChange(hex)}
              />
            ))}
          </div>
          <div className="color-grid color-grid--scroll" style={{ gridTemplateColumns: `repeat(${PALETTE_COLUMNS}, 1fr)` }}>
            {COLOR_PALETTE.map((hex, index) => (
              <button
                key={`${hex}-${index}`}
                type="button"
                className={`color-swatch ${value === hex ? "color-swatch--active" : ""}`}
                style={{ background: hex }}
                title={hex}
                onClick={() => onChange(hex)}
              />
            ))}
          </div>
          <div className="row">
            <input
              className="input input--sm grow"
              value={hexDraft}
              spellCheck={false}
              aria-label="Hex colour"
              onChange={(event) => setHexDraft(event.target.value)}
              onBlur={commitHex}
              onKeyDown={(event) => event.key === "Enter" && commitHex()}
            />
            <NativeColorInput value={isValidHex(value) ? normalizeHex(value) : "#000000"} onCommit={onChange} />
            {allowTransparent ? (
              <button type="button" className="btn btn--sm" onClick={() => onChange("transparent")}>
                None
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
