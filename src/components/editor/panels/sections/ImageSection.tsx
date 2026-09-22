"use client";
import { useRemoveBackground } from "@/hooks/use-remove-background";
import type { ImageElement } from "@/model/types";

interface ImageSectionProps {
  element: ImageElement;
}

/**
 * Image only tools. Background removal sends the picture to the server,
 * which runs the Python worker, and swaps in the cut out as one undo step.
 */
export function ImageSection({ element }: ImageSectionProps) {
  const { status, available, busy, run } = useRemoveBackground(element);

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Image</span>
      <button type="button" className="btn" disabled={busy || !available} onClick={() => void run()}>
        {busy ? "Removing background" : "Remove background"}
      </button>
      {status === undefined ? <p className="small muted">Checking whether background removal is set up.</p> : null}
      {status && !status.available ? (
        <p className="small muted">Background removal is off. {status.reason} See the README for the setup steps.</p>
      ) : null}
      {busy ? (
        <p className="small muted">This runs on the server. The first run downloads the model and can take a minute.</p>
      ) : null}
      {available && !busy ? (
        <p className="small muted">Cuts out the subject and makes the rest transparent. Runs on your own machine.</p>
      ) : null}
    </section>
  );
}
