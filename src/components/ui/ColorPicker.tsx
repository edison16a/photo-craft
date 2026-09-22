"use client";
import { useRef, useState } from "react";
import { ColorPalette } from "./ColorPalette";
import { Popover } from "./Popover";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  /** Show a "None" option that sets the colour to "transparent". */
  allowTransparent?: boolean;
  /** Just the swatch, for toolbars. The label becomes the tooltip. */
  compact?: boolean;
}

/** Swatch button that opens the colour popover next to itself. */
export function ColorPicker({ label, value, onChange, allowTransparent, compact }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const isTransparent = value === "transparent";

  const swatch = (
    <button
      ref={anchorRef}
      type="button"
      className={`color-preview ${isTransparent ? "color-preview--none" : ""} ${compact ? "color-preview--compact" : ""}`}
      style={{ background: isTransparent ? undefined : value }}
      title={compact ? `${label}: ${value}` : value}
      aria-label={`${label}: ${value}`}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
    />
  );

  return (
    <>
      {compact ? (
        swatch
      ) : (
        <div className="field">
          <span className="field__label">{label}</span>
          {swatch}
        </div>
      )}
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} label={`${label} colours`} width={252}>
        <ColorPalette value={value} onChange={onChange} allowTransparent={allowTransparent} />
      </Popover>
    </>
  );
}
