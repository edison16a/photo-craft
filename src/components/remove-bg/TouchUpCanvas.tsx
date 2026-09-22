"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { beginStroke, getWork, paintSegment, workToBlob, type Brush, type TouchUpWork } from "@/lib/remove-bg/touch-up";
import { useRemoveBgStore, type RemovalItem } from "@/store/remove-bg-store";

interface TouchUpCanvasProps {
  item: RemovalItem;
  brush: Brush;
  width: number;
  height: number;
}

/**
 * The cutout as a canvas you can paint on. Strokes go onto the picture's
 * working canvas at full size and this view copies it. When a stroke
 * ends the cutout is re-encoded, so the thumbnail and the download follow.
 */
export function TouchUpCanvas({ item, brush, width, height }: TouchUpCanvasProps) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const workRef = useRef<TouchUpWork | null>(null);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);

  const redraw = () => {
    const display = displayRef.current;
    const work = workRef.current;
    const ctx = display?.getContext("2d");
    if (!display || !work || !ctx) return;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.drawImage(work.canvas, 0, 0, display.width, display.height);
  };

  useEffect(() => {
    let cancelled = false;
    void getWork(item).then((work) => {
      if (cancelled) return;
      workRef.current = work;
      setReady(true);
      redraw();
    });
    return () => {
      cancelled = true;
    };
    // The working canvas is keyed by the picture, not by its changing URLs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(redraw, [width, height, ready]);

  /** Pointer position in picture pixels. */
  const toPicture = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * item.width, y: ((event.clientY - rect.top) / rect.height) * item.height };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const work = workRef.current;
    if (!work || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    beginStroke(work);
    const point = toPicture(event);
    lastRef.current = point;
    paintSegment(work, point, point, brush);
    redraw();
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    const work = workRef.current;
    const last = lastRef.current;
    if (!work || !last) return;
    const point = toPicture(event);
    paintSegment(work, last, point, brush);
    lastRef.current = point;
    redraw();
  };

  const endStroke = async (event: PointerEvent<HTMLCanvasElement>) => {
    const work = workRef.current;
    if (!work || !lastRef.current) return;
    lastRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const blob = await workToBlob(work);
    const store = useRemoveBgStore.getState();
    const current = store.items.find((candidate) => candidate.id === item.id);
    if (!current) return;
    const url = URL.createObjectURL(blob);
    store.updateResult(item.id, blob, url, current.pristine ?? current.result);
    if (current.resultUrl) URL.revokeObjectURL(current.resultUrl);
  };

  const scale = width / item.width;
  return (
    <div className="touch-up checker" style={{ width, height }}>
      <canvas
        ref={displayRef}
        className={`touch-up__canvas ${ready ? "" : "touch-up__canvas--loading"}`}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => void endStroke(event)}
        onPointerCancel={(event) => void endStroke(event)}
        onPointerLeave={() => setCursor(null)}
      />
      {cursor ? (
        <div
          className={`touch-up__cursor touch-up__cursor--${brush.mode}`}
          style={{ left: cursor.x, top: cursor.y, width: brush.size * scale, height: brush.size * scale }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
