/**
 * Drags the stepped selection that lies beneath a locked element. Konva
 * never starts a drag on a locked element, as it is not draggable, so a
 * press that keeps the selection beneath one starts the drag here once
 * the pointer has moved as far as a drag needs. use-element-drag then
 * moves the selection and holds the locked element in place.
 */
import type Konva from "konva";

/**
 * Starts a drag on the node once the pointer moves Konva's drag distance
 * from where it is now. Gives up when the press ends first, so a plain
 * click stays a click.
 */
export function dragOnceMoved(node: Konva.Node): void {
  const stage = node.getStage();
  const start = stage?.getPointerPosition();
  if (!stage || !start) return;
  const ends = ["mouseup", "touchend", "touchcancel"] as const;
  const stop = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("touchmove", onMove);
    for (const type of ends) window.removeEventListener(type, stop);
  };
  const onMove = (evt: MouseEvent | TouchEvent) => {
    // A release outside the window can go unseen. No button held means the press is over.
    if ("buttons" in evt && evt.buttons === 0) return stop();
    stage.setPointersPositions(evt);
    const pointer = stage.getPointerPosition();
    if (!pointer || Math.max(Math.abs(pointer.x - start.x), Math.abs(pointer.y - start.y)) < node.dragDistance()) return;
    stop();
    node.startDrag();
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove);
  for (const type of ends) window.addEventListener(type, stop);
}
