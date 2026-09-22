/**
 * Page level actions: add, duplicate, rename, delete, reorder and switch.
 */
import { createPage, duplicatePage as clonePage, nextPageName } from "../../model/project-factories";
import type { Project } from "../../model/types";
import { applyProjectChange, type Slice } from "../project-state";
import { movePage, withPage, withPages } from "../project-updates";

export interface PageActions {
  /** Replaces the open project and resets history and selection. */
  loadProject: (project: Project) => void;
  closeProject: () => void;
  renameProject: (name: string) => void;
  resizeProject: (width: number, height: number) => void;
  /** Clears the unsaved flag if the given project is still the one in the store. */
  markSaved: (saved: Project) => void;

  setCurrentPage: (pageId: string) => void;
  addPage: () => void;
  duplicatePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  deletePage: (pageId: string) => void;
  movePage: (pageId: string, delta: -1 | 1) => void;
  setPageBackground: (pageId: string, background: string) => void;
}

export const createPageSlice: Slice<PageActions> = (set, get) => ({
  loadProject: (project) =>
    set({
      project,
      currentPageId: project.pages[0]?.id ?? "",
      selectedIds: [],
      history: { past: [], future: [] },
      dirty: false,
      savedAt: null,
    }),

  closeProject: () =>
    set({ project: null, currentPageId: "", selectedIds: [], history: { past: [], future: [] } }),

  renameProject: (name) =>
    applyProjectChange(set, get, (project) => {
      const trimmed = name.trim();
      return trimmed && trimmed !== project.name ? { ...project, name: trimmed } : project;
    }),

  resizeProject: (width, height) =>
    applyProjectChange(set, get, (project) => {
      const w = Math.round(width);
      const h = Math.round(height);
      if (w === project.width && h === project.height) return project;
      return { ...project, width: w, height: h };
    }),

  markSaved: (saved) =>
    set((state) => (state.project === saved ? { dirty: false, savedAt: Date.now() } : { savedAt: Date.now() })),

  setCurrentPage: (pageId) => {
    const { project, currentPageId } = get();
    if (!project || pageId === currentPageId) return;
    if (!project.pages.some((page) => page.id === pageId)) return;
    set({ currentPageId: pageId, selectedIds: [] });
  },

  addPage: () => {
    const { project } = get();
    if (!project) return;
    const page = createPage(nextPageName(project));
    applyProjectChange(set, get, (current) => withPages(current, [...current.pages, page]), {
      currentPageId: page.id,
      selectedIds: [],
    });
  },

  duplicatePage: (pageId) => {
    const { project } = get();
    const source = project?.pages.find((page) => page.id === pageId);
    if (!project || !source) return;
    const copy = clonePage(source);
    const index = project.pages.indexOf(source);
    applyProjectChange(
      set,
      get,
      (current) => {
        const pages = [...current.pages];
        pages.splice(index + 1, 0, copy);
        return withPages(current, pages);
      },
      { currentPageId: copy.id, selectedIds: [] },
    );
  },

  renamePage: (pageId, name) =>
    applyProjectChange(set, get, (project) => {
      const trimmed = name.trim();
      if (!trimmed) return project;
      return withPage(project, pageId, (page) =>
        page.name === trimmed ? page : { ...page, name: trimmed },
      );
    }),

  deletePage: (pageId) => {
    const { project, currentPageId } = get();
    if (!project || project.pages.length <= 1) return;
    const index = project.pages.findIndex((page) => page.id === pageId);
    if (index < 0) return;
    const remaining = project.pages.filter((page) => page.id !== pageId);
    const nextCurrent =
      currentPageId === pageId ? remaining[Math.min(index, remaining.length - 1)].id : currentPageId;
    applyProjectChange(set, get, (current) => withPages(current, remaining), {
      currentPageId: nextCurrent,
      selectedIds: [],
    });
  },

  movePage: (pageId, delta) =>
    applyProjectChange(set, get, (project) => movePage(project, pageId, delta)),

  setPageBackground: (pageId, background) =>
    applyProjectChange(set, get, (project) =>
      withPage(project, pageId, (page) =>
        page.background === background ? page : { ...page, background },
      ),
    ),
});
