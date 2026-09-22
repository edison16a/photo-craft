"use client";
import { useRef, useState } from "react";
import { ensureFontLoaded } from "@/lib/font-loader";
import { Popover } from "../../ui/Popover";
import { FontList } from "./FontList";

interface FontPickerProps {
  value: string;
  onChange: (family: string) => void;
  /** A narrow button without a label, for toolbars. */
  compact?: boolean;
}

/** Button showing the current font that opens the searchable font list. */
export function FontPicker({ value, onChange, compact }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  /** Applies the font at once; the text redraws itself when the font file arrives. */
  const pick = (family: string) => {
    void ensureFontLoaded(family);
    onChange(family);
    setOpen(false);
  };

  const button = (
    <button
      ref={anchorRef}
      type="button"
      className={`btn font-picker__value ${compact ? "btn--sm font-picker__value--compact" : "btn--block"}`}
      style={{ fontFamily: `"${value}", Arial, sans-serif` }}
      title={compact ? `Font: ${value}` : undefined}
      aria-label={`Font: ${value}`}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
    >
      {value}
    </button>
  );

  return (
    <>
      {compact ? (
        button
      ) : (
        <div className="field">
          <span className="field__label">Font</span>
          {button}
        </div>
      )}
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} label="Fonts" width={280}>
        <FontList value={value} onPick={pick} />
      </Popover>
    </>
  );
}
