/**
 * What the draw tool does with corners: add one, take the last one back,
 * start over, or turn them into a shape on the page. The corners live in
 * the editor UI store; the finished shape goes into the project.
 */
import { cornersNeeded, extendsStraightRun, shapeFromPoints } from "../lib/drawing";
import { createShapeElement } from "../model/element-factories";
import type { Point } from "../model/types";
import { useEditorUiStore } from "./editor-ui-store";
import { useProjectStore } from "./project-store";

/**
 * Places one corner. Snap it to the grid before calling. A repeat of the
 * last corner is ignored, and a corner straight on from the last side
 * just moves that side's end, so a drag along a grid line stays one side.
 */
export function addDrawPoint(point: Point): void {
  const ui = useEditorUiStore.getState();
  const points = ui.drawPoints;
  if (points.length >= 2 && Math.abs(points[points.length - 2] - point.x) < 0.5 && Math.abs(points[points.length - 1] - point.y) < 0.5) return;
  const kept = extendsStraightRun(points, point) ? points.slice(0, -2) : points;
  ui.setDrawPoints([...kept, point.x, point.y]);
}

/** Takes the last corner back. */
export function undoDrawPoint(): void {
  const ui = useEditorUiStore.getState();
  ui.setDrawPoints(ui.drawPoints.slice(0, -2));
}

/** Drops every corner placed so far. */
export function cancelDrawing(): void {
  useEditorUiStore.getState().setDrawPoints([]);
}

/** True when enough corners are down to make a shape. */
export function canFinishDrawing(): boolean {
  const ui = useEditorUiStore.getState();
  return ui.drawPoints.length / 2 >= cornersNeeded(ui.drawOptions);
}

/**
 * Turns the corners into a custom shape on the current page, selects it
 * and goes back to the pointer. Returns false when there are not enough
 * corners yet, leaving everything as it was.
 */
export function finishDrawing(): boolean {
  const ui = useEditorUiStore.getState();
  const shape = shapeFromPoints(ui.drawPoints, ui.drawOptions);
  if (!shape) return false;
  useProjectStore.getState().addElement(createShapeElement("custom", shape));
  ui.setDrawPoints([]);
  ui.setTool("select");
  ui.openPanel("properties");
  return true;
}
