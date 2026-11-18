/**
 * Turns a Konva pointer event on an element into the PointerInput that
 * element-clicks decides the selection from.
 */
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Vector2d } from "konva/lib/types";
import type { PointerInput } from "@/store/element-clicks";
import { screenToPage } from "@/store/viewport-actions";

/**
 * Ids of the elements drawn under a point on the stage. Konva tests each
 * shape's own hit area, so the empty corners of an ellipse or a star do
 * not count.
 */
export function elementsUnder(stage: Konva.Stage, pointer: Vector2d): string[] {
  const ids = new Set<string>();
  for (const shape of stage.getAllIntersections(pointer)) {
    const id = shape.findAncestor(".element")?.id();
    if (id) ids.add(id);
  }
  return [...ids];
}

/** What element-clicks needs to know about a Konva pointer event on the element with this id. */
export function pointerInput(event: KonvaEventObject<MouseEvent | TouchEvent>, id: string): PointerInput | null {
  const stage = event.target.getStage();
  const pointer = stage?.getPointerPosition();
  if (!stage || !pointer) return null;
  const evt = event.evt;
  return {
    id,
    point: screenToPage(pointer),
    under: () => elementsUnder(stage, pointer),
    button: "button" in evt ? evt.button : 0,
    shift: evt.shiftKey,
    mod: evt.ctrlKey || evt.metaKey,
  };
}
