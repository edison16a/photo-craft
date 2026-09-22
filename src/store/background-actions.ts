/**
 * Removing an image's background, or putting it back, from anywhere in the
 * editor: the buttons, the right click menu and the keyboard. The image is
 * marked busy while the remover works so nothing starts it twice.
 */
import { getCachedImage } from "../lib/image-cache";
import type { ImageElement } from "../model/types";
import { removeBackgroundFromDataUrl } from "../services/background-removal";
import { useEditorUiStore } from "./editor-ui-store";
import { useProjectStore } from "./project-store";
import { selectCurrentElements } from "./selectors";

/** The one selected image, when exactly one element is selected and it is an image. */
export function selectedImage(): ImageElement | null {
  const store = useProjectStore.getState();
  if (store.selectedIds.length !== 1) return null;
  const element = selectCurrentElements(store).find((candidate) => candidate.id === store.selectedIds[0]);
  return element?.type === "image" ? element : null;
}

/**
 * Cuts the background out of an image and swaps the cutout in as one undo
 * step, with a sweep over the image once it lands. When the background was
 * already removed, the original goes back instead.
 */
export async function toggleBackground(element: ImageElement): Promise<void> {
  const { showToast, setImageBusy, busyImageIds } = useEditorUiStore.getState();
  if (busyImageIds.includes(element.id)) return;
  if (element.originalSrc) {
    useProjectStore.getState().updateElement(element.id, { src: element.originalSrc, originalSrc: undefined });
    showToast("Background put back.");
    return;
  }
  const pageId = useProjectStore.getState().currentPageId;
  setImageBusy(element.id, true);
  try {
    const result = await removeBackgroundFromDataUrl(element.src);
    // Decode the cutout into the shared cache first, so the canvas shows it before the sweep starts.
    await getCachedImage(result.src).catch(() => undefined);
    const store = useProjectStore.getState();
    const page = store.project?.pages.find((candidate) => candidate.id === pageId);
    const stillHere = store.currentPageId === pageId && page?.elements.some((el) => el.id === element.id);
    if (!stillHere) {
      showToast("The image is no longer on this page, so the cut out was not applied.", "error");
      return;
    }
    store.updateElement(element.id, { src: result.src, naturalWidth: result.width, naturalHeight: result.height, originalSrc: element.src });
    useEditorUiStore.getState().startReveal({ elementId: element.id, originalSrc: element.src, cutoutSrc: result.src });
    showToast("Background removed. Press the button again to put it back.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Background removal failed", "error");
  } finally {
    setImageBusy(element.id, false);
  }
}
