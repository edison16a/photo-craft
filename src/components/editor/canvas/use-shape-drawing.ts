"use client";
/**
 * Pointer handling for the draw tool. Every click places a corner on the
 * nearest grid crossing, so sides come out straight and lined up. A double
 * click on one spot, or a click on the first corner once there are three,
 * finishes the shape.
 */
import { useCallback, useRef, useState } from "react";
import { snapToGrid } from "@/lib/drawing";
import type { Point } from "@/model/types";
import { addDrawPoint, finishDrawing } from "@/store/drawing-actions";
import { useEditorUiStore } from "@/store/editor-ui-store";

/** How far from the first corner, in screen pixels, a click still counts as closing the shape. */
const CLOSE_RADIUS_PX = 10;

/** Handlers for the stage while the draw tool is active, plus the snapped pointer position for the rubber band. */
export function useShapeDrawing() {
  const pressed = useRef<Point | null>(null);
  const [hover, setHover] = useState<Point | null>(null);

  const snap = (point: Point) => snapToGrid(point, useEditorUiStore.getState().drawOptions.grid);
  const zoom = () => useEditorUiStore.getState().zoom;

  const onMouseDown = useCallback((point: Point) => {
    pressed.current = snap(point);
  }, []);

  const onMouseMove = useCallback((point: Point) => {
    setHover(snap(point));
  }, []);

  /** The corner goes where the press started, so a slight drag is still a click. */
  const onMouseUp = useCallback(() => {
    const corner = pressed.current;
    pressed.current = null;
    if (!corner) return;
    const { drawPoints } = useEditorUiStore.getState();
    const nearFirst = drawPoints.length >= 6 && Math.hypot(corner.x - drawPoints[0], corner.y - drawPoints[1]) * zoom() <= CLOSE_RADIUS_PX;
    if (nearFirst && finishDrawing()) return;
    addDrawPoint(corner);
  }, []);

  /**
   * Konva reports a double click for any two quick clicks on the page, even
   * far apart. Only two clicks on the same spot finish the shape; the rest
   * are just corners placed quickly.
   */
  const onDoubleClick = useCallback(() => {
    pressed.current = null;
    const { drawPoints } = useEditorUiStore.getState();
    if (drawPoints.length < 4) return;
    const [x1, y1, x2, y2] = drawPoints.slice(-4);
    if (Math.hypot(x2 - x1, y2 - y1) * zoom() <= CLOSE_RADIUS_PX) finishDrawing();
  }, []);

  const onMouseLeave = useCallback(() => {
    setHover(null);
    pressed.current = null;
  }, []);

  return { hover, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onDoubleClick };
}
