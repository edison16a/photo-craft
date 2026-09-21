/**
 * The editor store. Holds the open project, the current page, the selection
 * and undo history. Actions are split into slices under `slices/`.
 *
 * Usage:
 *   const project = useProjectStore((s) => s.project);
 *   useProjectStore.getState().addElement(element);
 */
import { create } from "zustand";
import { initialProjectState, type ProjectStore } from "./project-state";
import { createElementSlice } from "./slices/element-slice";
import { createHistorySlice } from "./slices/history-slice";
import { createPageSlice } from "./slices/page-slice";
import { createSelectionSlice } from "./slices/selection-slice";

export const useProjectStore = create<ProjectStore>()((...args) => ({
  ...initialProjectState(),
  ...createPageSlice(...args),
  ...createSelectionSlice(...args),
  ...createElementSlice(...args),
  ...createHistorySlice(...args),
}));

export type { ProjectStore } from "./project-state";
