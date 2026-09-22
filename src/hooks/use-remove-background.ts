"use client";
/**
 * Runs background removal for one image element, or puts the background
 * back when it was already removed. Shared by the side panel, the quick
 * toolbar and the right click menu so they all show the same state and
 * the same messages.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { ImageElement } from "../model/types";
import { isBackgroundRemovalSupported } from "../services/background-removal";
import { toggleBackground } from "../store/background-actions";
import { useEditorUiStore } from "../store/editor-ui-store";

/** What a button needs to offer background removal for one image. */
export interface RemoveBackgroundControls {
  /** Whether this browser can run the remover. False on the server, so buttons start disabled. */
  supported: boolean;
  /** True while this element's cutout is queued or running. */
  busy: boolean;
  /** True when the background was removed and the original is still around. */
  removed: boolean;
  /** What the button should say. */
  label: string;
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

  const removed = Boolean(element.originalSrc);

  const run = useCallback(() => toggleBackground(element), [element]);

  const label = busy ? "Removing background" : removed ? "Restore background" : "Remove background";
  return { supported, busy, removed, label, run };
}
