/**
 * Selection actions. Selection is a list of element IDs on the current page.
 * It is not part of undo history on its own, but each undo step remembers
 * what was selected so undo feels natural.
 */
import type { CanvasElement } from "../../model/types";
import { findPage } from "../project-updates";
import type { Slice } from "../project-state";

/** Actions that change which elements are selected. */
export interface SelectionActions {
  setSelection: (ids: string[]) => void;
  addToSelection: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  /** Elements on the current page that are selected, in stacking order. */
  getSelectedElements: () => CanvasElement[];
}

/** Builds the selection actions for the store. */
export const createSelectionSlice: Slice<SelectionActions> = (set, get) => ({
  setSelection: (ids) => {
    const { selectedIds } = get();
    if (ids.length === selectedIds.length && ids.every((id, i) => id === selectedIds[i])) return;
    set({ selectedIds: [...new Set(ids)] });
  },

  addToSelection: (ids) => {
    const { selectedIds } = get();
    set({ selectedIds: [...new Set([...selectedIds, ...ids])] });
  },

  toggleSelected: (id) => {
    const { selectedIds } = get();
    set({
      selectedIds: selectedIds.includes(id)
        ? selectedIds.filter((existing) => existing !== id)
        : [...selectedIds, id],
    });
  },

  clearSelection: () => {
    if (get().selectedIds.length > 0) set({ selectedIds: [] });
  },

  selectAll: () => {
    const { project, currentPageId } = get();
    const page = project ? findPage(project, currentPageId) : undefined;
    if (!page) return;
    set({ selectedIds: page.elements.map((element) => element.id) });
  },

  getSelectedElements: () => {
    const { project, currentPageId, selectedIds } = get();
    const page = project ? findPage(project, currentPageId) : undefined;
    if (!page) return [];
    const wanted = new Set(selectedIds);
    return page.elements.filter((element) => wanted.has(element.id));
  },
});
