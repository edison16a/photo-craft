"use client";
import { useRemoveBackground } from "@/hooks/use-remove-background";
import type { ImageElement } from "@/model/types";

interface ImageSectionProps {
  element: ImageElement;
}

/** Just enough of the model download to set expectations. */
const FIRST_USE_HINT = "The first use downloads a 44 MB model, then it is kept for next time.";

/**
 * Image only tools. Background removal runs in the browser and swaps in
 * the cutout as one undo step.
 */
export function ImageSection({ element }: ImageSectionProps) {
  const { supported, ready, busy, progress, run } = useRemoveBackground(element);

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Image</span>
      <button type="button" className="btn" disabled={busy || !supported} onClick={() => void run()}>
        {busy ? (progress ?? "Removing background") : "Remove background"}
      </button>
      {!supported ? (
        <p className="small muted">This browser cannot run the background remover. Try a current Chrome, Edge, Firefox or Safari.</p>
      ) : null}
      {supported && !busy ? (
        <p className="small muted">
          Cuts out the subject and makes the rest transparent. Runs on your own machine. {ready ? "" : FIRST_USE_HINT}
        </p>
      ) : null}
      {busy ? <p className="small muted">Larger pictures take a few seconds. You can keep working meanwhile.</p> : null}
    </section>
  );
}
