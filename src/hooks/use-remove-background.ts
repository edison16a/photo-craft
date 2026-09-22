"use client";
/**
 * Runs background removal for one image element. Shared by the side panel
 * and the quick toolbar so both show the same state and the same messages.
 */
import { useCallback } from "react";
import type { ImageElement } from "../model/types";
import { removeImageBackground } from "../services/background-removal";
import { useEditorUiStore } from "../store/editor-ui-store";
import { useProjectStore } from "../store/project-store";
import type { BackgroundRemovalStatus } from "../services/background-removal";
import { useBackgroundRemovalStatus } from "./use-background-removal-status";

/** What a button needs to offer background removal for one image. */
export interface RemoveBackgroundControls {
  /** Server status, or undefined while the first check is running. */
  status: BackgroundRemovalStatus | undefined;
  available: boolean;
  /** True while this element's request is in flight. */
  busy: boolean;
  run: () => Promise<void>;
}

/**
 * The in flight flag lives in the editor UI store, keyed by element id, so
 * deselecting and reselecting the image mid run cannot start a second run.
 */
export function useRemoveBackground(element: ImageElement): RemoveBackgroundControls {
  const status = useBackgroundRemovalStatus();
  const busy = useEditorUiStore((s) => s.busyImageIds.includes(element.id));

  const run = useCallback(async () => {
    const { showToast, setImageBusy, busyImageIds } = useEditorUiStore.getState();
    if (busyImageIds.includes(element.id)) return;
    const pageId = useProjectStore.getState().currentPageId;
    setImageBusy(element.id, true);
    try {
      const result = await removeImageBackground(element.src);
      const store = useProjectStore.getState();
      const page = store.project?.pages.find((candidate) => candidate.id === pageId);
      const stillHere = store.currentPageId === pageId && page?.elements.some((el) => el.id === element.id);
      if (!stillHere) {
        showToast("The image is no longer on this page, so the cut out was not applied.", "error");
        return;
      }
      store.updateElement(element.id, { src: result.src, naturalWidth: result.width, naturalHeight: result.height });
      showToast("Background removed. Undo with Ctrl+Z to bring it back.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Background removal failed", "error");
    } finally {
      setImageBusy(element.id, false);
    }
  }, [element.id, element.src]);

  return { status, available: status?.available === true, busy, run };
}
