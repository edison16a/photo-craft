"use client";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { zoomIn, zoomOut, zoomTo, zoomToFit } from "@/store/viewport-actions";
import { IconButton } from "../ui/IconButton";

const LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

/** Zoom out, a percentage picker, zoom in and fit to screen. */
export function ZoomControls() {
  const zoom = useEditorUiStore((s) => s.zoom);
  const percent = Math.round(zoom * 100);
  const options = LEVELS.includes(zoom) ? LEVELS : [...LEVELS, zoom].sort((a, b) => a - b);

  return (
    <div className="row" style={{ gap: 2 }}>
      <IconButton icon="zoomOut" label="Zoom out" onClick={zoomOut} />
      <select
        className="select zoom-select"
        aria-label="Zoom level"
        value={zoom}
        onChange={(event) => zoomTo(Number(event.target.value))}
      >
        {options.map((level) => (
          <option key={level} value={level}>
            {level === zoom ? `${percent}%` : `${Math.round(level * 100)}%`}
          </option>
        ))}
      </select>
      <IconButton icon="zoomIn" label="Zoom in" onClick={zoomIn} />
      <IconButton icon="fit" label="Fit to screen" onClick={zoomToFit} />
    </div>
  );
}
