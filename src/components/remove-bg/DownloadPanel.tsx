"use client";
import { useState } from "react";
import { downloadAllCutouts, downloadCutout, type CutoutFormat } from "@/lib/remove-bg/export";
import { MAX_OUTPUT_SIDE, scaleOf, sizeFromHeight, sizeFromScale, sizeFromWidth, type Size } from "@/lib/remove-bg/sizing";
import { useEditorUiStore } from "@/store/editor-ui-store";
import type { RemovalItem } from "@/store/remove-bg-store";
import { NumberField } from "../ui/NumberField";

interface DownloadPanelProps {
  item: RemovalItem | null;
  items: RemovalItem[];
  format: CutoutFormat;
  onFormatChange: (format: CutoutFormat) => void;
  onClear: () => void;
}

const FORMATS: { id: CutoutFormat; label: string }[] = [
  { id: "png", label: "PNG" },
  { id: "webp", label: "WebP" },
];

const PRESETS = [
  { label: "Original", scale: 1 },
  { label: "Half", scale: 0.5 },
  { label: "Double", scale: 2 },
];

/**
 * Format and size for saving, one picture or all of them. Render it with
 * the item's id as its key so the size goes back to the original when
 * the picture changes.
 */
export function DownloadPanel({ item, items, format, onFormatChange, onClear }: DownloadPanelProps) {
  const [size, setSize] = useState<Size | null>(null);
  const [busy, setBusy] = useState(false);
  const doneCount = items.filter((candidate) => candidate.status === "done").length;
  const ready = item?.status === "done";
  const chosen = item ? (size ?? { width: item.width, height: item.height }) : null;
  const scale = item && chosen ? scaleOf(item, chosen) : 1;

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      useEditorUiStore.getState().showToast(error instanceof Error ? error.message : "Download failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="download">
      <span className="label">Download</span>
      <div className="segmented" role="group" aria-label="Format">
        {FORMATS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`segmented__item ${format === option.id ? "segmented__item--active" : ""}`}
            onClick={() => onFormatChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {item && chosen ? (
        <>
          <div className="row">
            <NumberField label="Width" value={chosen.width} min={1} max={MAX_OUTPUT_SIDE} suffix="px" onCommit={(width) => setSize(sizeFromWidth(item, width))} />
            <NumberField label="Height" value={chosen.height} min={1} max={MAX_OUTPUT_SIDE} suffix="px" onCommit={(height) => setSize(sizeFromHeight(item, height))} />
          </div>
          <div className="row row--wrap">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`btn btn--sm ${Math.abs(scale - preset.scale) < 0.001 ? "btn--active" : ""}`}
                onClick={() => setSize(sizeFromScale(item, preset.scale))}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="small muted">Proportions are always kept. The background stays transparent.</p>
          <button type="button" className="btn btn--primary btn--block" disabled={!ready || busy} onClick={() => void run(() => downloadCutout(item, chosen, format))}>
            {ready ? `Download ${format.toUpperCase()}` : "Not ready yet"}
          </button>
        </>
      ) : null}
      {items.length > 1 ? (
        <>
          <button type="button" className="btn btn--block" disabled={doneCount === 0 || busy} onClick={() => void run(() => downloadAllCutouts(items, scale, format))}>
            Download all ({doneCount}) as ZIP
          </button>
          <p className="small muted">Every picture is scaled the same way as this one.</p>
        </>
      ) : null}
      <button type="button" className="btn btn--ghost btn--block" onClick={onClear}>
        Clear all
      </button>
    </aside>
  );
}
