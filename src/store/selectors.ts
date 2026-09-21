/**
 * Small selector helpers for reading derived state from the project store.
 * Keep them stable so components can pass them straight to the hook.
 */
import type { CanvasElement, Page } from "../model/types";
import type { ProjectStore } from "./project-state";

/**
 * Shared empty results. Selectors must return the same reference when
 * nothing changed, otherwise zustand sees a new value on every render and
 * React loops forever.
 */
export const EMPTY_ELEMENTS: CanvasElement[] = [];
export const EMPTY_PAGES: Page[] = [];

/** The page that is open in the editor, or undefined before a project loads. */
export function selectCurrentPage(state: ProjectStore): Page | undefined {
  return state.project?.pages.find((page) => page.id === state.currentPageId);
}

/** Elements on the current page, in stacking order. */
export function selectCurrentElements(state: ProjectStore): CanvasElement[] {
  return selectCurrentPage(state)?.elements ?? EMPTY_ELEMENTS;
}

/** The single selected element, or undefined when zero or many are selected. */
export function selectSingleSelected(state: ProjectStore): CanvasElement | undefined {
  if (state.selectedIds.length !== 1) return undefined;
  return selectCurrentElements(state).find((element) => element.id === state.selectedIds[0]);
}

/** Pages of the open project, or a stable empty list before one loads. */
export function selectPages(state: ProjectStore): Page[] {
  return state.project?.pages ?? EMPTY_PAGES;
}

/** Index of the current page in the project. */
export function selectCurrentPageIndex(state: ProjectStore): number {
  return state.project?.pages.findIndex((page) => page.id === state.currentPageId) ?? -1;
}
