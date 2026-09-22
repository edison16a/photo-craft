"use client";
import { useLayoutEffect, useRef, useState } from "react";

interface TabsProps<T extends string> {
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  /** What the tabs switch between, for screen readers. */
  label: string;
}

/** Where the blue line sits, relative to the row. */
interface Underline {
  left: number;
  width: number;
}

/** A row of tabs with one blue line that slides under the chosen one. */
export function Tabs<T extends string>({ items, value, onChange, label }: TabsProps<T>) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState<Underline | null>(null);

  // Measure the chosen tab after each change so the line can slide to it.
  useLayoutEffect(() => {
    const active = rowRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    setUnderline(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
  }, [value]);

  return (
    <div ref={rowRef} className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`tabs__item ${active ? "tabs__item--active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
      <span
        className="tabs__underline"
        aria-hidden="true"
        style={underline ? { left: underline.left, width: underline.width, opacity: 1 } : { opacity: 0 }}
      />
    </div>
  );
}
