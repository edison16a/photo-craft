"use client";
import { useRef, useState } from "react";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { zoomIn, zoomOut, zoomTo, zoomToFit } from "@/store/viewport-actions";
import { Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";
import { Popover } from "../ui/Popover";

const LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

/** Zoom in, zoom out and a dropdown with preset levels and fit to screen. */
export function ZoomControls() {
  const zoom = useEditorUiStore((s) => s.zoom);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const percent = Math.round(zoom * 100);

  const pick = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="row" style={{ gap: 2 }}>
      <IconButton icon="zoomIn" label="Zoom in (Ctrl+Plus)" onClick={zoomIn} />
      <IconButton icon="zoomOut" label="Zoom out (Ctrl+Minus)" onClick={zoomOut} />
      <button
        ref={anchorRef}
        type="button"
        className="btn btn--sm zoom-value"
        aria-label={`Zoom level ${percent}%`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {percent}%
        <Icon name="chevronDown" size={14} />
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} label="Zoom levels" width={150}>
        <div className="stack" style={{ gap: 2 }}>
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`zoom-menu__item ${Math.abs(level - zoom) < 0.001 ? "zoom-menu__item--active" : ""}`}
              onClick={() => pick(() => zoomTo(level))}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
          <hr className="context-menu__divider" />
          <button type="button" className="zoom-menu__item" onClick={() => pick(zoomToFit)}>
            Fit to screen
            <span className="small muted">Ctrl+0</span>
          </button>
        </div>
      </Popover>
    </div>
  );
}
