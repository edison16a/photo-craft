/**
 * Alignment of elements to the page or to each other.
 *
 * The selection is split into units, so a group moves as one piece. A
 * single unit aligns to the page. Two or more align to the bounding box
 * of the whole selection, which is what people expect from "align left"
 * in a layout tool.
 */
import { rotatedBoundingBox, unionRects } from "../lib/geometry";
import { isFrozenUnit, splitIntoUnits } from "../lib/groups";
import type { CanvasElement, Rect } from "../model/types";

/** Edges and centres an element can be aligned to. */
export type Alignment = "left" | "centerX" | "right" | "top" | "centerY" | "bottom";

/** Axis aligned box an element covers on the page after rotation. */
export function elementBounds(element: CanvasElement): Rect {
  return rotatedBoundingBox(
    { x: element.x, y: element.y, width: element.width, height: element.height },
    element.rotation,
  );
}

/** Position delta that moves `box` so it lines up with `target`. */
function alignmentDelta(box: Rect, target: Rect, alignment: Alignment): { dx: number; dy: number } {
  switch (alignment) {
    case "left":
      return { dx: target.x - box.x, dy: 0 };
    case "centerX":
      return { dx: target.x + target.width / 2 - (box.x + box.width / 2), dy: 0 };
    case "right":
      return { dx: target.x + target.width - (box.x + box.width), dy: 0 };
    case "top":
      return { dx: 0, dy: target.y - box.y };
    case "centerY":
      return { dx: 0, dy: target.y + target.height / 2 - (box.y + box.height / 2) };
    case "bottom":
      return { dx: 0, dy: target.y + target.height - (box.y + box.height) };
  }
}

/**
 * Returns a new element list with the selected elements aligned, or the
 * same list when nothing needed to move. Every member of a unit moves by
 * the same amount, worked out from the unit's bounds. A unit with a
 * locked member stays where it is but still counts towards the selection
 * box.
 */
export function alignElements(
  elements: CanvasElement[],
  ids: readonly string[],
  alignment: Alignment,
  page: { width: number; height: number },
): CanvasElement[] {
  const selected = new Set(ids);
  const units = splitIntoUnits(elements.filter((element) => selected.has(element.id)));
  if (units.length === 0) return elements;

  const boxes = units.map((unit) => unionRects(unit.map(elementBounds)));
  const target: Rect =
    units.length === 1 ? { x: 0, y: 0, width: page.width, height: page.height } : unionRects(boxes);

  const moves = new Map<string, { dx: number; dy: number }>();
  units.forEach((unit, index) => {
    if (isFrozenUnit(unit)) return;
    const delta = alignmentDelta(boxes[index], target, alignment);
    if (Math.abs(delta.dx) < 0.001 && Math.abs(delta.dy) < 0.001) return;
    for (const element of unit) moves.set(element.id, delta);
  });
  if (moves.size === 0) return elements;
  return elements.map((element) => {
    const move = moves.get(element.id);
    return move ? { ...element, x: element.x + move.dx, y: element.y + move.dy } : element;
  });
}
