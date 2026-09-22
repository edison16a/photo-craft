"use client";
import { useEffect, useMemo, useState } from "react";
import { FONT_CATEGORIES, FONTS } from "@/data/fonts";
import { ensureFontLoaded } from "@/lib/font-loader";

interface FontListProps {
  value: string;
  onPick: (family: string) => void;
}

/** How many fonts to render at once. More appear as you scroll. */
const PAGE = 30;

/** Searchable list of fonts. Each name is drawn in its own font once it loads. */
export function FontList({ value, onPick }: FontListProps) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? FONTS.filter((font) => font.family.toLowerCase().includes(q)) : FONTS;
  }, [query]);
  const shown = matches.slice(0, limit);

  // Only fetch fonts for the rows on screen.
  useEffect(() => {
    for (const font of matches.slice(0, limit)) void ensureFontLoaded(font.family);
  }, [matches, limit]);

  const categoryLabel = (id: string) => FONT_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="stack" style={{ gap: 6 }}>
      <input
        className="input input--sm"
        placeholder="Search fonts"
        data-autofocus="true"
        value={query}
        aria-label="Search fonts"
        onChange={(event) => {
          setQuery(event.target.value);
          setLimit(PAGE);
        }}
      />
      <div
        className="font-picker__scroll"
        onScroll={(event) => {
          const el = event.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40 && limit < matches.length) setLimit((n) => n + PAGE);
        }}
      >
        {shown.map((font) => (
          <button
            key={font.family}
            type="button"
            className={`font-picker__item ${font.family === value ? "font-picker__item--active" : ""}`}
            style={{ fontFamily: `"${font.family}", Arial, sans-serif` }}
            onClick={() => onPick(font.family)}
          >
            <span>{font.family}</span>
            <span className="small muted" style={{ fontFamily: "var(--font-ui)" }}>{categoryLabel(font.category)}</span>
          </button>
        ))}
        {shown.length === 0 ? <p className="small muted" style={{ padding: 8 }}>No fonts match.</p> : null}
      </div>
      <span className="small muted">{matches.length} fonts. Google Fonts load when picked.</span>
    </div>
  );
}
