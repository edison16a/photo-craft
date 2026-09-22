"use client";
/**
 * Rubber band selection. Dragging on empty page area draws a rectangle and
 * selects every element it touches.
 */
import { useCallback, useRef, useState } from "react";
import { rectsIntersect } from "@/lib/geometry";
import type { Point, Rect } from "@/model/types";
import { elementBounds } from "@/store/alignment";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";

interface Marquee {
  start: Point;
  end: Point;
  additive: boolean;
}

/** Minimum drag distance in screen pixels before a marquee counts as a drag. */
const MIN_SIZE_PX = 3;

/** Axis aligned rectangle between the two corners of a marquee. */
export function marqueeRect(marquee: Marquee): Rect {
  return {
    x: Math.min(marquee.start.x, marquee.end.x),
    y: Math.min(marquee.start.y, marquee.end.y),
    width: Math.abs(marquee.end.x - marquee.start.x),
    height: Math.abs(marquee.end.y - marquee.start.y),
  };
}

function bigEnough(rect: Rect): boolean {
  const min = MIN_SIZE_PX / useEditorUiStore.getState().zoom;
  return rect.width >= min || rect.height >= min;
}

/**
 * Marquee state and handlers. The current marquee lives in a ref so finish
 * can read it and update the selection outside of any React updater; the
 * state copy only drives drawing.
 */
export function useMarquee() {
  const current = useRef<Marquee | null>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);

  const begin = useCallback((point: Point, additive: boolean) => {
    current.current = { start: point, end: point, additive };
    setMarquee(current.current);
  }, []);

  const move = useCallback((point: Point) => {
    if (!current.current) return;
    current.current = { ...current.current, end: point };
    setMarquee(current.current);
  }, []);

  const finish = useCallback(() => {
    const active = current.current;
    current.current = null;
    setMarquee(null);
    if (!active) return;
    const rect = marqueeRect(active);
    if (!bigEnough(rect)) return;
    const state = useProjectStore.getState();
    const hits = selectCurrentElements(state)
      .filter((element) => rectsIntersect(rect, elementBounds(element)))
      .map((element) => element.id);
    if (active.additive) state.addToSelection(hits);
    else state.setSelection(hits);
  }, []);

  const rect = marquee ? marqueeRect(marquee) : null;
  return { marquee, rect: rect && bigEnough(rect) ? rect : null, begin, move, finish };
}
