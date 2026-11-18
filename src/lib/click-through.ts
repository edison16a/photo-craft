/**
 * Click again to select what is behind. Works out which units sit under a
 * point, using each element's box turned about its centre, and which one
 * comes after the clicked one going down the stacking order.
 */
import type { CanvasElement, Point } from "../model/types";
import { degToRad } from "./geometry";
import { unitKey } from "./groups";

/** Slack in page pixels so a point right on an edge counts despite rounding. */
const EDGE_SLACK = 1e-6;

/** True when the point is inside the element's box rotated about its centre. Edges count. */
export function boxContainsPoint(
  element: Pick<CanvasElement, "x" | "y" | "width" | "height" | "rotation">,
  point: Point,
): boolean {
  const halfWidth = element.width / 2;
  const halfHeight = element.height / 2;
  const dx = point.x - (element.x + halfWidth);
  const dy = point.y - (element.y + halfHeight);
  // Turn the point back by the element's rotation so the box is upright.
  const rad = degToRad(element.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  return Math.abs(localX) <= halfWidth + EDGE_SLACK && Math.abs(localY) <= halfHeight + EDGE_SLACK;
}

/**
 * Units under the point from top to bottom, each as the ids of all its
 * members in stacking order. A group counts once, at the place of its
 * highest member under the point. The element named by `include` counts
 * as under the point even if its box misses it, since Konva can hit a
 * stroke that pokes out of the box.
 */
export function unitsUnderPoint(elements: readonly CanvasElement[], point: Point, include?: string): string[][] {
  const order: string[] = [];
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    if (element.id !== include && !boxContainsPoint(element, point)) continue;
    const key = unitKey(element);
    if (!order.includes(key)) order.push(key);
  }
  return order.map((key) => elements.filter((element) => unitKey(element) === key).map((element) => element.id));
}

/**
 * The unit to select after a click at the point on an element that was
 * already selected: the next unit below the clicked one's, wrapping from
 * the bottom back to the top. Null when nothing else is under the point.
 */
export function nextUnitUnder(elements: readonly CanvasElement[], clickedId: string, point: Point): string[] | null {
  const units = unitsUnderPoint(elements, point, clickedId);
  if (units.length < 2) return null;
  const current = units.findIndex((unit) => unit.includes(clickedId));
  return units[(current + 1) % units.length];
}
