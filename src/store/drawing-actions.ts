/**
 * What the draw tool does with corners: add one, add a whole freehand
 * stroke, take the last one back, start over, or turn them into a shape
 * on the page. The corners live in the editor UI store; the finished
 * shape goes into the project.
 */
import { cornersNeeded, shapeFromPoints } from "../lib/drawing";
import { simplifyPoints } from "../lib/simplify";
import { createShapeElement } from "../model/element-factories";
import type { Point } from "../model/types";
import { useEditorUiStore } from "./editor-ui-store";
import { useProjectStore } from "./project-store";

/** Places one corner. */
export function addDrawPoint(point: Point): void {
  const ui = useEditorUiStore.getState();
  ui.setDrawPoints([...ui.drawPoints, point.x, point.y]);
}

/**
 * Adds a freehand stroke as a run of corners, thinned so only the bends
 * that matter at the given tolerance (in page pixels) are kept.
 */
export function addDrawStroke(stroke: number[], tolerance: number): void {
  const ui = useEditorUiStore.getState();
  ui.setDrawPoints([...ui.drawPoints, ...simplifyPoints(stroke, tolerance)]);
  ui.setDrawStroke([]);
}

/** Takes the last corner back. */
export function undoDrawPoint(): void {
  const ui = useEditorUiStore.getState();
  ui.setDrawPoints(ui.drawPoints.slice(0, -2));
}

/** Drops every corner placed so far. */
export function cancelDrawing(): void {
  const ui = useEditorUiStore.getState();
  ui.setDrawPoints([]);
  ui.setDrawStroke([]);
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
  ui.setDrawStroke([]);
  ui.setTool("select");
  ui.openPanel("properties");
  return true;
}
