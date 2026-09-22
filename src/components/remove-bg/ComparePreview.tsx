"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRemoveBgStore, type RemovalItem } from "@/store/remove-bg-store";
import { CompareView } from "../ui/CompareView";
import { Sparkles } from "../ui/Sparkles";
import { TouchUpCanvas } from "./TouchUpCanvas";

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
 * twinkle over the original and nothing else gets in the way. When the
 * cutout arrives it sweeps in from the
 * right, and from then on the line can be dragged to compare, or a brush
 * can paint on it. Render it with the item's id as its key so the state
 * resets when the picture changes.
 */
export function ComparePreview({ item }: ComparePreviewProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [split, setSplit] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const previousStatus = useRef(item?.status);
  const touchUp = useRemoveBgStore((s) => s.touchUp);
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

  const painting = done && touchUp.tool !== null;
  return (
    <section ref={containerRef} className="preview">
      {box && painting && touchUp.tool ? (
        <TouchUpCanvas item={item} brush={{ mode: touchUp.tool, size: touchUp.size, softness: touchUp.softness }} width={box.width} height={box.height} />
      ) : null}
      {box && !painting ? (
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
