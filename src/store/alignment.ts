/**
 * Alignment of elements to the page or to each other.
 *
 * A single selected element aligns to the page. Two or more align to the
 * bounding box of the whole selection, which is what people expect from
 * "align left" in a layout tool.
 */
import { rotatedBoundingBox, unionRects } from "../lib/geometry";
import type { CanvasElement, Rect } from "../model/types";

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
 * Returns a new element list with the selected elements aligned. Locked
 * elements stay where they are but still count towards the selection box.
 */
export function alignElements(
  elements: CanvasElement[],
  ids: readonly string[],
  alignment: Alignment,
  page: { width: number; height: number },
): CanvasElement[] {
  const selected = new Set(ids);
  const chosen = elements.filter((element) => selected.has(element.id));
  if (chosen.length === 0) return elements;

  const target: Rect =
    chosen.length === 1
      ? { x: 0, y: 0, width: page.width, height: page.height }
      : unionRects(chosen.map(elementBounds));

  return elements.map((element) => {
    if (!selected.has(element.id) || element.locked) return element;
    const { dx, dy } = alignmentDelta(elementBounds(element), target, alignment);
    if (dx === 0 && dy === 0) return element;
    return { ...element, x: element.x + dx, y: element.y + dy };
  });
}
