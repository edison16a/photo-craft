"use client";
/**
 * The inside of the colour popover: project colours, a dozen basics, the
 * full grid, a hex field, the browser's own dialog and an optional None.
 */
import { useEffect, useState } from "react";
import { COLOR_PALETTE, PALETTE_COLUMNS, QUICK_COLORS, isValidHex, normalizeHex } from "@/data/colors";
import { useProjectColors } from "@/hooks/use-project-colors";
import { NativeColorInput } from "./NativeColorInput";

interface ColorPaletteProps {
  value: string;
  onChange: (hex: string) => void;
  /** Show a "None" option that sets the colour to "transparent". */
  allowTransparent?: boolean;
}

interface SwatchRowProps {
  colors: string[];
  value: string;
  onChange: (hex: string) => void;
  scroll?: boolean;
}

function Swatches({ colors, value, onChange, scroll }: SwatchRowProps) {
  return (
    <div className={`color-grid ${scroll ? "color-grid--scroll" : ""}`} style={{ gridTemplateColumns: `repeat(${PALETTE_COLUMNS}, 1fr)` }}>
      {colors.map((hex, index) => (
        <button
          key={`${hex}-${index}`}
          type="button"
          className={`color-swatch ${value === hex ? "color-swatch--active" : ""}`}
          style={{ background: hex }}
          title={hex}
          aria-label={hex}
          onClick={() => onChange(hex)}
        />
      ))}
    </div>
  );
}

/** Colour choices shared by every picker in the app. */
export function ColorPalette({ value, onChange, allowTransparent }: ColorPaletteProps) {
  const projectColors = useProjectColors();
  const [hexDraft, setHexDraft] = useState(value);

  useEffect(() => setHexDraft(value), [value]);

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
    <div className="stack" style={{ gap: 8 }}>
      {projectColors.length > 0 ? (
        <div className="stack" style={{ gap: 4 }}>
          <span className="label">Project colours</span>
          <Swatches colors={projectColors} value={value} onChange={onChange} />
        </div>
      ) : null}
      <div className="stack" style={{ gap: 4 }}>
        <span className="label">Basics</span>
        <Swatches colors={QUICK_COLORS} value={value} onChange={onChange} />
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <span className="label">All colours</span>
        <Swatches colors={COLOR_PALETTE} value={value} onChange={onChange} scroll />
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
  );
}
