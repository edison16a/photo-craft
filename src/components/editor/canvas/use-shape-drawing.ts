"use client";
/**
 * Pointer handling for the draw tool. Every corner lands on the nearest
 * grid crossing, so sides come out straight and lined up. A click places
 * one corner; holding the mouse down and dragging plots a corner at every
 * crossing the pointer passes. Reaching the first corner again with three
 * or more down closes and finishes the shape, as does a double click on
 * one spot.
 */
import { useCallback, useRef, useState } from "react";
import { snapToGrid } from "@/lib/drawing";
import type { Point } from "@/model/types";
import { addDrawPoint, finishDrawing } from "@/store/drawing-actions";
import { useEditorUiStore } from "@/store/editor-ui-store";

function samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
}

/** Handlers for the stage while the draw tool is active, plus the snapped pointer position for the rubber band. */
export function useShapeDrawing() {
  const down = useRef(false);
  /** Whether the last press landed on the corner before it, which is what a double click on one spot looks like. */
  const lastPressRepeated = useRef(false);
  const [hover, setHover] = useState<Point | null>(null);

  const snap = (point: Point) => snapToGrid(point, useEditorUiStore.getState().drawOptions.grid);

  /**
   * Adds a corner unless it repeats the last one. Landing on the first
   * corner with enough corners down finishes instead.
   */
  const plot = useCallback((point: Point): "added" | "repeat" | "finished" => {
    const { drawPoints, drawOptions } = useEditorUiStore.getState();
    const count = drawPoints.length / 2;
    if (count > 0 && samePoint(point, { x: drawPoints[drawPoints.length - 2], y: drawPoints[drawPoints.length - 1] })) return "repeat";
    // Corners sit on grid crossings, so closing means landing on the very first one.
    const closing = count >= 3 && drawOptions.closed && samePoint(point, { x: drawPoints[0], y: drawPoints[1] });
    if (closing && finishDrawing()) return "finished";
    addDrawPoint(point);
    return "added";
  }, []);

  const onMouseDown = useCallback(
    (point: Point) => {
      const outcome = plot(snap(point));
      lastPressRepeated.current = outcome === "repeat";
      down.current = outcome !== "finished";
    },
    [plot],
  );

  const onMouseMove = useCallback(
    (point: Point) => {
      const snapped = snap(point);
      setHover(snapped);
      if (down.current && plot(snapped) === "finished") down.current = false;
    },
    [plot],
  );

  const onMouseUp = useCallback(() => {
    down.current = false;
  }, []);

  /**
   * Konva reports a double click for any two quick clicks on the page, even
   * far apart. Only two clicks on the same spot finish the shape; the rest
   * are just corners placed quickly.
   */
  const onDoubleClick = useCallback(() => {
    down.current = false;
    // Only when the second click landed on the corner the first one placed.
    if (lastPressRepeated.current) finishDrawing();
  }, []);

  const onMouseLeave = useCallback(() => {
    setHover(null);
    down.current = false;
  }, []);

  return { hover, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onDoubleClick };
}
