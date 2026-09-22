"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { FONT_CATEGORIES, FONTS } from "@/data/fonts";
import { ensureFontLoaded } from "@/lib/font-loader";

interface FontPickerProps {
  value: string;
  onChange: (family: string) => void;
}

/** How many fonts to render at once. More appear as you scroll. */
const PAGE = 30;

/** Searchable list of fonts. Each name is drawn in its own font once it is loaded. */
export function FontPicker({ value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const anchorRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? FONTS.filter((font) => font.family.toLowerCase().includes(q)) : FONTS;
  }, [query]);
  const shown = matches.slice(0, limit);

  // Only fetch fonts for the rows on screen while the list is open.
  useEffect(() => {
    if (!open) return;
    for (const font of matches.slice(0, limit)) void ensureFontLoaded(font.family);
  }, [open, matches, limit]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = async (family: string) => {
    await ensureFontLoaded(family);
    onChange(family);
    setOpen(false);
  };

  const categoryLabel = (id: string) => FONT_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="field font-picker" ref={anchorRef}>
      <span className="field__label">Font</span>
      <button type="button" className="btn btn--block font-picker__value" style={{ fontFamily: `"${value}", Arial, sans-serif` }} onClick={() => setOpen((v) => !v)}>
        {value}
      </button>
      {open ? (
        <div className="font-picker__list stack" style={{ gap: 6 }}>
          <input className="input input--sm" placeholder="Search fonts" autoFocus value={query}
            onChange={(event) => { setQuery(event.target.value); setLimit(PAGE); }} />
          <div className="font-picker__scroll"
            onScroll={(event) => {
              const el = event.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40 && limit < matches.length) setLimit((n) => n + PAGE);
            }}>
            {shown.map((font) => (
              <button key={font.family} type="button" className={`font-picker__item ${font.family === value ? "font-picker__item--active" : ""}`}
                style={{ fontFamily: `"${font.family}", Arial, sans-serif` }} onClick={() => void pick(font.family)}>
                <span>{font.family}</span>
                <span className="small muted" style={{ fontFamily: "var(--font-ui)" }}>{categoryLabel(font.category)}</span>
              </button>
            ))}
            {shown.length === 0 ? <p className="small muted" style={{ padding: 8 }}>No fonts match.</p> : null}
          </div>
          <span className="small muted">{matches.length} fonts. Google Fonts load when picked.</span>
        </div>
      ) : null}
    </div>
  );
}
