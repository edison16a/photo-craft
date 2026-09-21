/**
 * Undo and redo. Each step restores the project, the page that was open and
 * the selection at that time.
 */
import { redoHistory, undoHistory } from "../history";
import type { Slice } from "../project-state";

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const createHistorySlice: Slice<HistoryActions> = (set, get) => ({
  undo: () => {
    const { project, currentPageId, selectedIds, history } = get();
    if (!project) return;
    const result = undoHistory(history, { project, currentPageId, selectedIds });
    if (!result) return;
    set({ ...result.snapshot, history: result.history, dirty: true });
  },

  redo: () => {
    const { project, currentPageId, selectedIds, history } = get();
    if (!project) return;
    const result = redoHistory(history, { project, currentPageId, selectedIds });
    if (!result) return;
    set({ ...result.snapshot, history: result.history, dirty: true });
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,
});
