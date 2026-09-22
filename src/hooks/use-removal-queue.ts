"use client";
/**
 * Works through the remove background page's queue one picture at a
 * time. Whenever nothing is running and something is waiting, the next
 * picture goes to the remover, and its item is updated when it finishes.
 * The running job is tracked in a ref rather than in the effect, so the
 * store updates it causes never cancel it.
 */
import { useCallback, useEffect, useRef } from "react";
import { removeBackground } from "../services/background-removal";
import { nextQueuedItem, useRemoveBgStore } from "../store/remove-bg-store";

/** Runs while the page is mounted. Call it once, from the screen. */
export function useRemovalQueue(): void {
  const items = useRemoveBgStore((s) => s.items);
  const running = useRef<string | null>(null);

  const startNext = useCallback(() => {
    if (running.current) return;
    const store = useRemoveBgStore.getState;
    const next = nextQueuedItem(store().items);
    if (!next) return;
    running.current = next.id;
    store().markWorking(next.id);
    // The picture may be removed while it is running; then its result is dropped.
    const stillHere = () => store().items.some((item) => item.id === next.id);
    removeBackground(next.original)
      .then((cutout) => {
        if (stillHere()) store().finish(next.id, cutout.blob, URL.createObjectURL(cutout.blob));
      })
      .catch((error: unknown) => {
        if (stillHere()) store().fail(next.id, error instanceof Error ? error.message : "Background removal failed.");
      })
      .finally(() => {
        running.current = null;
        startNext();
      });
  }, []);

  useEffect(() => {
    startNext();
  }, [items, startNext]);
}
