"use client";
import { useState } from "react";
import { describeRemovalPhase, useRemovalProgressStore } from "@/store/removal-progress-store";
import { useRemoveBgStore, type RemovalItem } from "@/store/remove-bg-store";

interface CutoutPreviewProps {
  item: RemovalItem | null;
}

type View = "cutout" | "original";

/** What the status line under the toggle should say for an item. */
function describeItem(item: RemovalItem, phase: string | null): string {
  if (item.status === "working") return phase ?? "Removing background";
  if (item.status === "queued") return "Waiting for its turn";
  if (item.status === "failed") return item.error ?? "Background removal failed.";
  return `${item.width} x ${item.height} px`;
}

/**
 * The big view of the chosen picture: the cutout on a checkerboard once
 * it is done, with a switch back to the original. Render it with the
 * item's id as its key so the switch resets when the picture changes.
 */
export function CutoutPreview({ item }: CutoutPreviewProps) {
  const [view, setView] = useState<View>("cutout");
  const phase = useRemovalProgressStore((s) => s.phase);
  const loaded = useRemovalProgressStore((s) => s.loaded);
  const total = useRemovalProgressStore((s) => s.total);

  if (!item) {
    return <section className="preview preview--empty muted">Nothing to show.</section>;
  }
  const done = item.status === "done" && Boolean(item.resultUrl);
  const showCutout = done && view === "cutout";
  const status = describeItem(item, describeRemovalPhase({ phase, loaded, total }));

  return (
    <section className="preview">
      <div className="preview__bar">
        <div className="segmented" role="group" aria-label="Show">
          <button type="button" className={`segmented__item ${showCutout ? "segmented__item--active" : ""}`} disabled={!done} onClick={() => setView("cutout")}>
            Cutout
          </button>
          <button type="button" className={`segmented__item ${!showCutout ? "segmented__item--active" : ""}`} onClick={() => setView("original")}>
            Original
          </button>
        </div>
        <span className={`small ${item.status === "failed" ? "preview__error" : "muted"}`} role="status">
          {status}
        </span>
        {item.status === "failed" ? (
          <button type="button" className="btn btn--sm" onClick={() => useRemoveBgStore.getState().retry(item.id)}>
            Try again
          </button>
        ) : null}
      </div>
      <div className={`preview__stage ${showCutout ? "checker" : ""}`}>
        {/* Object URLs cannot go through next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={showCutout ? item.resultUrl : item.originalUrl}
          alt={item.name}
          draggable={false}
          className={`preview__img ${item.status === "working" ? "preview__img--busy" : ""}`}
        />
      </div>
    </section>
  );
}
