"use client";
/**
 * Saves quietly a moment after the last change while autosave is on, and
 * warns before the tab closes when there are unsaved changes.
 */
import { useEffect } from "react";
import { useProjectStore } from "../store/project-store";

export const AUTOSAVE_DELAY_MS = 1500;

export function useAutosave(enabled: boolean, save: (quiet?: boolean) => Promise<boolean>): void {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!useProjectStore.getState().dirty) return;
        void save(true).then(() => {
          // Edits made while the save was running are still unsaved. Go again.
          if (useProjectStore.getState().dirty && !timer) schedule();
        });
      }, AUTOSAVE_DELAY_MS);
    };

    if (useProjectStore.getState().dirty) schedule();
    const unsubscribe = useProjectStore.subscribe((state, previous) => {
      if (state.dirty && state.project !== previous.project) schedule();
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, save]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (useProjectStore.getState().dirty) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
}
