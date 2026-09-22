"use client";
/**
 * Pointer handling for the draw tool. A click places a corner. Pressing
 * and dragging draws freehand, which becomes a run of corners when the
 * pointer lifts. A double click, or a click on the first corner once there
 * are three, finishes the shape.
 */
import { useCallback, useRef, useState } from "react";
import type { Point } from "@/model/types";
import { addDrawPoint, addDrawStroke, finishDrawing } from "@/store/drawing-actions";
import { useEditorUiStore } from "@/store/editor-ui-store";

/** Movement in screen pixels before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD_PX = 3;
/** Spacing of freehand samples in screen pixels. */
const SAMPLE_SPACING_PX = 2;
/** How far from the first corner, in screen pixels, a click still counts as closing the shape. */
const CLOSE_RADIUS_PX = 10;
/** Bends smaller than this many screen pixels are dropped from a freehand stroke. */
const SIMPLIFY_TOLERANCE_PX = 1.5;

interface Press {
  start: Point;
  stroke: number[];
  dragging: boolean;
}

/** Handlers for the stage while the draw tool is active, plus the pointer position for the rubber band. */
export function useShapeDrawing() {
  const press = useRef<Press | null>(null);
  const [hover, setHover] = useState<Point | null>(null);

  const zoom = () => useEditorUiStore.getState().zoom;

  const onMouseDown = useCallback((point: Point) => {
    press.current = { start: point, stroke: [point.x, point.y], dragging: false };
  }, []);

  const onMouseMove = useCallback((point: Point) => {
    setHover(point);
    const current = press.current;
    if (!current) return;
    const scale = zoom();
    if (!current.dragging && Math.hypot(point.x - current.start.x, point.y - current.start.y) * scale < DRAG_THRESHOLD_PX) return;
    current.dragging = true;
    const lastX = current.stroke[current.stroke.length - 2];
    const lastY = current.stroke[current.stroke.length - 1];
    if (Math.hypot(point.x - lastX, point.y - lastY) * scale < SAMPLE_SPACING_PX) return;
    current.stroke.push(point.x, point.y);
    useEditorUiStore.getState().setDrawStroke(current.stroke.slice());
  }, []);

  const onMouseUp = useCallback(() => {
    const current = press.current;
    press.current = null;
    if (!current) return;
    const scale = zoom();
    if (current.dragging) {
      addDrawStroke(current.stroke, SIMPLIFY_TOLERANCE_PX / scale);
      return;
    }
    const { drawPoints } = useEditorUiStore.getState();
    const nearFirst = drawPoints.length >= 6 && Math.hypot(current.start.x - drawPoints[0], current.start.y - drawPoints[1]) * scale <= CLOSE_RADIUS_PX;
    if (nearFirst && finishDrawing()) return;
    addDrawPoint(current.start);
  }, []);

  /**
   * Konva reports a double click for any two quick clicks on the page, even
   * far apart. Only two clicks on the same spot finish the shape; the rest
   * are just corners placed quickly.
   */
  const onDoubleClick = useCallback(() => {
    press.current = null;
    const { drawPoints } = useEditorUiStore.getState();
    if (drawPoints.length < 4) return;
    const [x1, y1, x2, y2] = drawPoints.slice(-4);
    if (Math.hypot(x2 - x1, y2 - y1) * zoom() <= CLOSE_RADIUS_PX) finishDrawing();
  }, []);

  const onMouseLeave = useCallback(() => {
    setHover(null);
    onMouseUp();
  }, [onMouseUp]);

  return { hover, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onDoubleClick };
}
