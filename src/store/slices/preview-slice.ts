/**
 * Live previews: many small changes while a field is typed in or a slider
 * is dragged, recorded as one undo step when the interaction ends.
 *
 * beginPreview remembers where the project was. previewElements applies
 * quiet changes on top (no history, not marked unsaved). endPreview pushes
 * the remembered snapshot into history if anything changed.
 */
import type { CanvasElement } from "../../model/types";
import { pushHistory } from "../history";
import { applyProjectChange, type Slice } from "../project-state";
import { patchElement, withElements } from "../project-updates";
import type { ElementPatches } from "./element-slice";

export interface PreviewActions {
  /** Starts an interaction. Safe to call again while one is running. */
  beginPreview: () => void;
  /** Applies a patch to elements without touching history. */
  previewElements: (ids: string[], patch: Partial<CanvasElement>) => void;
  /** Applies a different patch per element without touching history. */
  previewPatches: (patches: ElementPatches) => void;
  /** Ends the interaction and records one undo step for everything since begin. */
  endPreview: () => void;
}

export const createPreviewSlice: Slice<PreviewActions> = (set, get) => ({
  beginPreview: () => {
    const { project, currentPageId, selectedIds, previewBase } = get();
    if (!project || previewBase) return;
    set({ previewBase: { project, currentPageId, selectedIds } });
  },

  previewElements: (ids, patch) => {
    const { currentPageId } = get();
    applyProjectChange(
      set,
      get,
      (project) => withElements(project, currentPageId, ids, (element) => patchElement(element, patch)),
      { quiet: true },
    );
  },

  previewPatches: (patches) => {
    const ids = Object.keys(patches);
    if (ids.length === 0) return;
    const { currentPageId } = get();
    applyProjectChange(
      set,
      get,
      (project) => withElements(project, currentPageId, ids, (element) => patchElement(element, patches[element.id])),
      { quiet: true },
    );
  },

  endPreview: () => {
    const { project, previewBase, history } = get();
    if (!previewBase) return;
    if (!project || project === previewBase.project) {
      set({ previewBase: null });
      return;
    }
    set({
      previewBase: null,
      project: { ...project, updatedAt: Date.now() },
      history: pushHistory(history, previewBase),
      dirty: true,
    });
  },
});
