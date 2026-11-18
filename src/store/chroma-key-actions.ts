/**
 * Chroma key from anywhere in the editor: starting the eyedropper on an
 * image, the click that picks the colour, and leaving pick mode once the
 * image is no longer the one thing selected.
 */
import { pickedKey } from "../lib/chroma-key";
import { peekCachedImage } from "../lib/image-cache";
import { sampleImageAt } from "../lib/pixel-sample";
import type { ImageElement, Point } from "../model/types";
import { useEditorUiStore } from "./editor-ui-store";
import { useProjectStore, type ProjectStore } from "./project-store";
import { selectCurrentElements } from "./selectors";

/** An image on the current page by id. */
function imageOnPage(state: ProjectStore, id: string): ImageElement | null {
  const element = selectCurrentElements(state).find((candidate) => candidate.id === id);
  return element?.type === "image" ? element : null;
}

/**
 * Starts picking a key colour on an image, selecting it on its own first.
 * Asking again for the image already being picked from stops instead.
 */
export function toggleColorPick(elementId: string): void {
  const ui = useEditorUiStore.getState();
  if (ui.pickingColorFor === elementId) return ui.endColorPick();
  const store = useProjectStore.getState();
  if (!imageOnPage(store, elementId)) return;
  if (ui.tool !== "select") ui.setTool("select");
  if (store.selectedIds.length !== 1 || store.selectedIds[0] !== elementId) store.setSelection([elementId]);
  useEditorUiStore.getState().startColorPick(elementId);
}

/** Keys an image to a colour in one undo step, keeping the tolerance and softness it had. */
export function applyPickedColor(elementId: string, color: string): void {
  const store = useProjectStore.getState();
  const element = imageOnPage(store, elementId);
  if (element) store.updateElement(elementId, { chromaKey: pickedKey(color, element.chromaKey) });
}

/**
 * The click in pick mode. On the picture it keys the colour under the
 * point; off it, or on a see through pixel, nothing changes. Either way
 * pick mode ends.
 */
export function pickColorAt(point: Point): void {
  const ui = useEditorUiStore.getState();
  const id = ui.pickingColorFor;
  if (!id) return;
  ui.endColorPick();
  const element = imageOnPage(useProjectStore.getState(), id);
  const image = element ? peekCachedImage(element.src) : undefined;
  if (!element || !image) return;
  const sample = sampleImageAt(element, image, point);
  if (sample && sample.alpha > 0) applyPickedColor(id, sample.color);
}

/** Whether an image can still be picked from: on the current page and the only thing selected. */
export function canKeepPicking(state: ProjectStore, id: string): boolean {
  return state.selectedIds.length === 1 && state.selectedIds[0] === id && imageOnPage(state, id) !== null;
}

/** Ends pick mode whenever its image stops being the one selected. Returns the unsubscribe. */
export function watchPickTarget(): () => void {
  return useProjectStore.subscribe((state) => {
    const ui = useEditorUiStore.getState();
    if (ui.pickingColorFor && !canKeepPicking(state, ui.pickingColorFor)) ui.endColorPick();
  });
}
