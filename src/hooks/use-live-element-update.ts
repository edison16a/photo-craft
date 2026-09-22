"use client";
/**
 * Preview and commit helpers for fields that change elements live.
 *
 * preview applies a change straight away without an undo step. commit
 * applies the final value and records the whole interaction as one step.
 * A commit without a preview first is an ordinary recorded change.
 */
import { useMemo } from "react";
import type { CanvasElement } from "../model/types";
import { useProjectStore } from "../store/project-store";

export interface LiveElementUpdate {
  preview: (patch: Partial<CanvasElement>) => void;
  commit: (patch: Partial<CanvasElement>) => void;
}

export function useLiveElementUpdate(ids: string[]): LiveElementUpdate {
  const key = ids.join(",");
  return useMemo(() => {
    const targets = key ? key.split(",") : [];
    const store = useProjectStore.getState;
    return {
      preview: (patch) => {
        store().beginPreview();
        store().previewElements(targets, patch);
      },
      commit: (patch) => {
        if (store().previewBase) {
          store().previewElements(targets, patch);
          store().endPreview();
        } else {
          store().updateElements(targets, patch);
        }
      },
    };
  }, [key]);
}
