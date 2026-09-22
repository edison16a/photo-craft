"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { describeRemovalPhase, useRemovalProgressStore } from "@/store/removal-progress-store";
import { useRemoveBgStore, type RemovalItem } from "@/store/remove-bg-store";
import { CompareView } from "./CompareView";
import { Sparkles } from "./Sparkles";

interface ComparePreviewProps {
  item: RemovalItem | null;
}

interface Box {
  width: number;
  height: number;
}

/** How long the reveal sweep takes. Matches the stylesheet's transition. */
const REVEAL_MS = 1400;

/**
 * The big view of the chosen picture. While it is being worked on, stars
 * twinkle over the original. When the cutout arrives it sweeps in from the
 * right, and from then on the line can be dragged to compare. Render it
 * with the item's id as its key so the state resets when the picture changes.
 */
export function ComparePreview({ item }: ComparePreviewProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [split, setSplit] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const previousStatus = useRef(item?.status);
  const phase = useRemovalProgressStore((s) => s.phase);
  const loaded = useRemovalProgressStore((s) => s.loaded);
  const total = useRemovalProgressStore((s) => s.total);
  const width = item?.width ?? 0;
  const height = item?.height ?? 0;

  // Fit the picture into the column at its own proportions, never larger than life.
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node || width <= 0 || height <= 0) return;
    const fit = () => {
      const rect = node.getBoundingClientRect();
      const scale = Math.min(1, rect.width / width, rect.height / height);
      if (!Number.isFinite(scale) || scale <= 0) return;
      setBox({ width: Math.floor(width * scale), height: Math.floor(height * scale) });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width, height]);

  // A cutout that arrives while showing sweeps in from the right.
  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = item?.status;
    if (item?.status !== "done" || before === "done") return;
    setSplit(1);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setRevealing(true);
        setSplit(0);
      });
    });
    const timer = setTimeout(() => setRevealing(false), REVEAL_MS + 100);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      clearTimeout(timer);
    };
  }, [item?.status]);

  if (!item) {
    return (
      <section ref={containerRef} className="preview preview--empty muted">
        Nothing to show.
      </section>
    );
  }
  const done = item.status === "done" && Boolean(item.resultUrl);
  const busy = item.status === "working" || item.status === "queued";
  const busyText = item.status === "working" ? (describeRemovalPhase({ phase, loaded, total }) ?? "Removing background") : "Waiting for its turn";

  return (
    <section ref={containerRef} className="preview">
      {box ? (
        <CompareView
          originalUrl={item.originalUrl}
          cutoutUrl={done ? item.resultUrl : undefined}
          split={split}
          onSplitChange={
            done
              ? (next) => {
                  setRevealing(false);
                  setSplit(next);
                }
              : undefined
          }
          revealing={revealing}
          width={box.width}
          height={box.height}
          alt={item.name}
          className={item.status === "working" ? "compare--busy" : ""}
        >
          {item.status === "working" ? <Sparkles seed={item.id} /> : null}
          {busy ? (
            <div className="compare__status" role="status">
              {busyText}
            </div>
          ) : null}
          {item.status === "failed" ? (
            <div className="compare__status compare__status--error" role="status">
              <span>{item.error ?? "Background removal failed."}</span>
              <button type="button" className="btn btn--sm" onClick={() => useRemoveBgStore.getState().retry(item.id)}>
                Try again
              </button>
            </div>
          ) : null}
        </CompareView>
      ) : null}
    </section>
  );
}
