"use client";
/**
 * Runs background removal for one image element, or puts the background
 * back when it was already removed. Shared by the side panel, the quick
 * toolbar and the right click menu so they all show the same state and
 * the same messages.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { ImageElement } from "../model/types";
import { isBackgroundRemovalSupported, removeBackgroundFromDataUrl } from "../services/background-removal";
import { useEditorUiStore } from "../store/editor-ui-store";
import { useProjectStore } from "../store/project-store";
import { describeRemovalPhase, useRemovalProgressStore } from "../store/removal-progress-store";

/** What a button needs to offer background removal for one image. */
export interface RemoveBackgroundControls {
  /** Whether this browser can run the remover. False on the server, so buttons start disabled. */
  supported: boolean;
  /** True once the model is loaded, so the next run needs no download. */
  ready: boolean;
  /** True while this element's cutout is queued or running. */
  busy: boolean;
  /** True when the background was removed and the original is still around. */
  removed: boolean;
  /** What the button should say. */
  label: string;
  /** What the remover is doing right now, for a busy label. */
  progress: string | null;
  run: () => Promise<void>;
}

const subscribeNever = () => () => undefined;

/**
 * The in flight flag lives in the editor UI store, keyed by element id, so
 * deselecting and reselecting the image mid run cannot start a second run.
 */
export function useRemoveBackground(element: ImageElement): RemoveBackgroundControls {
  const supported = useSyncExternalStore(subscribeNever, isBackgroundRemovalSupported, () => false);
  const busy = useEditorUiStore((s) => s.busyImageIds.includes(element.id));
  const ready = useRemovalProgressStore((s) => s.ready);
  const phase = useRemovalProgressStore((s) => s.phase);
  const loaded = useRemovalProgressStore((s) => s.loaded);
  const total = useRemovalProgressStore((s) => s.total);

  const removed = Boolean(element.originalSrc);

  const run = useCallback(async () => {
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
      const store = useProjectStore.getState();
      const page = store.project?.pages.find((candidate) => candidate.id === pageId);
      const stillHere = store.currentPageId === pageId && page?.elements.some((el) => el.id === element.id);
      if (!stillHere) {
        showToast("The image is no longer on this page, so the cut out was not applied.", "error");
        return;
      }
      store.updateElement(element.id, { src: result.src, naturalWidth: result.width, naturalHeight: result.height, originalSrc: element.src });
      showToast("Background removed. Press the button again to put it back.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Background removal failed", "error");
    } finally {
      setImageBusy(element.id, false);
    }
  }, [element.id, element.src, element.originalSrc]);

  const label = removed ? "Restore background" : "Remove background";
  return { supported, ready, busy, removed, label, progress: busy ? describeRemovalPhase({ phase, loaded, total }) : null, run };
}
