/**
 * Remembers what the last click through step selected and where, so a
 * press on the element on top at that spot counts for the stepped
 * selection beneath it. Only the very selection the step made counts.
 * Any other change to the selection makes a new array, even one with the
 * same ids, so it ends the memory.
 */
import type { CanvasElement, Point } from "../model/types";
import { useEditorUiStore } from "./editor-ui-store";

/** How far in screen pixels a press may land from the last step and still count as the same spot. */
export const SAME_SPOT_PX = 8;

/** Where the last step landed and the selection array it left in the store. */
let lastStep: { point: Point; selection: readonly string[] } | null = null;

/** Records a step: the page point clicked and the selection array the store holds after it. */
export function rememberStep(point: Point, selection: readonly string[]): void {
  lastStep = { point, selection };
}

/** Forgets the last step. */
export function forgetStep(): void {
  lastStep = null;
}

/**
 * The selected element a press counts for when it hits an unselected
 * element on top: only when the press lands on the spot of the last step,
 * the selection is still the one that step made, and a selected element
 * is drawn under the pointer. The topmost such element wins.
 */
export function selectedBeneath(
  elements: readonly CanvasElement[],
  selectedIds: readonly string[],
  input: { id: string; point: Point; under: () => readonly string[] },
): string | undefined {
  if (!lastStep || lastStep.selection !== selectedIds || selectedIds.includes(input.id)) return undefined;
  const zoom = useEditorUiStore.getState().zoom;
  const distance = Math.hypot(input.point.x - lastStep.point.x, input.point.y - lastStep.point.y) * zoom;
  if (distance > SAME_SPOT_PX) return undefined;
  const under = input.under();
  return elements.findLast((element) => selectedIds.includes(element.id) && under.includes(element.id))?.id;
}
