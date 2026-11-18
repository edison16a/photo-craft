/**
 * The tap that picks a chroma key colour on a touch screen.
 */
import type { KonvaEventObject } from "konva/lib/Node";
import { pickColorAt } from "@/store/chroma-key-actions";
import { screenToPage } from "@/store/viewport-actions";

/**
 * Picks at the tapped point. The tap is cancelled first. Otherwise the
 * browser follows it with mouse events, which land once pick mode has
 * ended and clear the selection.
 */
export function pickOnTouch(event: KonvaEventObject<TouchEvent>): void {
  if (event.evt.cancelable) event.evt.preventDefault();
  const pointer = event.target.getStage()?.getPointerPosition();
  if (pointer) pickColorAt(screenToPage(pointer));
}
