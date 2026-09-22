"use client";
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./Icon";

interface CompareViewProps {
  originalUrl: string;
  /** The cutout. Without it only the original shows. */
  cutoutUrl?: string;
  /** Share of the width showing the original, from the left. 0 is all cutout. */
  split: number;
  /** When given, the line can be dragged and moved with the arrow keys. */
  onSplitChange?: (split: number) => void;
  /** Animate changes to the split instead of jumping. */
  revealing?: boolean;
  /**
   * Draw a checkerboard behind the cutout. Off, the original is clipped to
   * the left of the line and whatever is behind the box shows through the
   * cutout on the right.
   */
  checker?: boolean;
  /** Exact box in pixels. Leave out to let the stylesheet size it. */
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
  /** Overlays drawn on top, such as the sparkles and the status pill. */
  children?: ReactNode;
}

/** How far one arrow key press moves the line. */
const KEY_STEP = 0.05;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * The original and the cutout in one box, split by a vertical line. Left of
 * the line is the original, right of it the cutout, on a checkerboard unless
 * told otherwise. The line is dragged with the pointer or moved with the
 * arrow keys.
 */
export function CompareView({ originalUrl, cutoutUrl, split, onSplitChange, revealing, checker = true, width, height, className = "", alt = "", children }: CompareViewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const interactive = Boolean(cutoutUrl && onSplitChange);

  const splitFromPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const rect = boxRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      onSplitChange?.(clamp01((event.clientX - rect.left) / rect.width));
    },
    [onSplitChange],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    splitFromPointer(event);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) splitFromPointer(event);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSplitChange) return;
    const next = { ArrowLeft: split - KEY_STEP, ArrowRight: split + KEY_STEP, Home: 0, End: 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSplitChange(clamp01(next));
  };

  const classes = ["compare", revealing ? "compare--revealing" : "", interactive ? "compare--interactive" : "", dragging ? "compare--dragging" : "", className];
  return (
    <div
      ref={boxRef}
      className={classes.filter(Boolean).join(" ")}
      style={{ width, height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Object URLs cannot go through next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="compare__layer compare__original"
        src={originalUrl}
        alt={alt}
        draggable={false}
        style={checker || !cutoutUrl ? undefined : { clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}
      />
      {cutoutUrl ? (
        <div className={checker ? "compare__reveal checker" : "compare__reveal"} style={{ clipPath: `inset(0 0 0 ${split * 100}%)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="compare__layer" src={cutoutUrl} alt="" draggable={false} />
        </div>
      ) : null}
      {interactive || (cutoutUrl && revealing) ? (
        <div className="compare__line" style={{ left: `${split * 100}%` }}>
          {interactive ? (
          <div
            className="compare__handle"
            role="slider"
            tabIndex={0}
            aria-label="Compare the original and the cutout"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(split * 100)}
            onKeyDown={onKeyDown}
          >
            <Icon name="chevronLeft" size={14} />
            <Icon name="chevronRight" size={14} />
          </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
