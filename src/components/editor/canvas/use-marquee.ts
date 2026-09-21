"use client";
/**
 * Rubber band selection. Dragging on empty page area draws a rectangle and
 * selects every element it touches.
 */
import { useCallback, useState } from "react";
import { rectsIntersect } from "@/lib/geometry";
import type { Point, Rect } from "@/model/types";
import { elementBounds } from "@/store/alignment";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";

interface Marquee {
  start: Point;
  end: Point;
  additive: boolean;
}

/** Minimum drag distance in page pixels before a marquee counts as a drag. */
const MIN_SIZE = 3;

export function marqueeRect(marquee: Marquee): Rect {
  return {
    x: Math.min(marquee.start.x, marquee.end.x),
    y: Math.min(marquee.start.y, marquee.end.y),
    width: Math.abs(marquee.end.x - marquee.start.x),
    height: Math.abs(marquee.end.y - marquee.start.y),
  };
}

export function useMarquee() {
  const [marquee, setMarquee] = useState<Marquee | null>(null);

  const begin = useCallback((point: Point, additive: boolean) => {
    setMarquee({ start: point, end: point, additive });
  }, []);

  const move = useCallback((point: Point) => {
    setMarquee((current) => (current ? { ...current, end: point } : current));
  }, []);

  const finish = useCallback(() => {
    setMarquee((current) => {
      if (!current) return null;
      const rect = marqueeRect(current);
      if (rect.width >= MIN_SIZE || rect.height >= MIN_SIZE) {
        const state = useProjectStore.getState();
        const hits = selectCurrentElements(state)
          .filter((element) => rectsIntersect(rect, elementBounds(element)))
          .map((element) => element.id);
        if (current.additive) state.addToSelection(hits);
        else state.setSelection(hits);
      }
      return null;
    });
  }, []);

  const rect = marquee ? marqueeRect(marquee) : null;
  const active = marquee !== null && rect !== null && (rect.width >= MIN_SIZE || rect.height >= MIN_SIZE);

  return { marquee, rect: active ? rect : null, begin, move, finish };
}
