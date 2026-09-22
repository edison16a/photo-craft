/**
 * Element actions on the current page: add, change, remove, duplicate,
 * reorder, align, lock, flip, copy and paste.
 */
import { resizeKeepingCorner } from "../../lib/geometry";
import { cloneElement } from "../../model/element-factories";
import type { CanvasElement } from "../../model/types";
import { alignElements, type Alignment } from "../alignment";
import { applyProjectChange, type Slice } from "../project-state";
import {
  addElementsToPage,
  findPage,
  patchElement,
  removeElementsFromPage,
  reorderElements,
  withElements,
  withPage,
  type StackDirection,
} from "../project-updates";

/** Partial patch keyed by element ID. Used when several elements move at once. */
export type ElementPatches = Record<string, Partial<CanvasElement>>;

/** Actions that change elements on the current page. */
export interface ElementActions {
  addElement: (element: CanvasElement, select?: boolean) => void;
  addElements: (elements: CanvasElement[], select?: boolean) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  /** Applies one patch to many elements. Used by the properties panel. */
  updateElements: (ids: string[], patch: Partial<CanvasElement>) => void;
  /** Applies a different patch per element in one undo step. Used after drags. */
  patchElements: (patches: ElementPatches) => void;
  /** Stores a measured size without an undo step. Used for auto height text. */
  syncElementSize: (id: string, size: { width?: number; height?: number }) => void;
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  reorder: (ids: string[], direction: StackDirection) => void;
  align: (ids: string[], alignment: Alignment) => void;
  setLocked: (ids: string[], locked: boolean) => void;
  flip: (ids: string[], axis: "x" | "y") => void;
  nudge: (ids: string[], dx: number, dy: number) => void;
  copy: (ids: string[]) => void;
  paste: () => void;
}

const DUPLICATE_OFFSET = 24;

/** Builds the element actions for the store. */
export const createElementSlice: Slice<ElementActions> = (set, get) => ({
  addElement: (element, select = true) => get().addElements([element], select),

  addElements: (elements, select = true) => {
    if (elements.length === 0) return;
    const { currentPageId } = get();
    applyProjectChange(
      set,
      get,
      (project) => addElementsToPage(project, currentPageId, elements),
      select ? { selectedIds: elements.map((element) => element.id) } : {},
    );
  },

  updateElement: (id, patch) => get().updateElements([id], patch),

  updateElements: (ids, patch) => {
    const { currentPageId } = get();
    applyProjectChange(set, get, (project) =>
      withElements(project, currentPageId, ids, (element) => patchElement(element, patch)),
    );
  },

  patchElements: (patches) => {
    const ids = Object.keys(patches);
    if (ids.length === 0) return;
    const { currentPageId } = get();
    applyProjectChange(set, get, (project) =>
      withElements(project, currentPageId, ids, (element) => patchElement(element, patches[element.id])),
    );
  },

  syncElementSize: (id, size) => {
    const { currentPageId } = get();
    applyProjectChange(
      set,
      get,
      (project) =>
        withElements(project, currentPageId, [id], (element) => {
          const width = size.width ?? element.width;
          const height = size.height ?? element.height;
          if (width === element.width && height === element.height) return element;
          // Keep the rotated top left corner still, so rotated text grows
          // along its own axis instead of swinging around the centre.
          const { x, y } = resizeKeepingCorner(element, element.rotation, width, height);
          return { ...element, x, y, width, height };
        }),
      { quiet: true },
    );
  },

  removeElements: (ids) => {
    if (ids.length === 0) return;
    const { currentPageId, selectedIds } = get();
    const doomed = new Set(ids);
    applyProjectChange(
      set,
      get,
      (project) => removeElementsFromPage(project, currentPageId, ids),
      { selectedIds: selectedIds.filter((id) => !doomed.has(id)) },
    );
  },

  duplicateElements: (ids) => {
    const { project, currentPageId } = get();
    const page = project ? findPage(project, currentPageId) : undefined;
    if (!page) return;
    const wanted = new Set(ids);
    const copies = page.elements
      .filter((element) => wanted.has(element.id))
      .map((element) => cloneElement(element, DUPLICATE_OFFSET));
    get().addElements(copies, true);
  },

  reorder: (ids, direction) => {
    const { currentPageId } = get();
    applyProjectChange(set, get, (project) => reorderElements(project, currentPageId, ids, direction));
  },

  align: (ids, alignment) => {
    const { currentPageId } = get();
    applyProjectChange(set, get, (project) =>
      withPage(project, currentPageId, (page) => {
        const elements = alignElements(page.elements, ids, alignment, project);
        return elements === page.elements ? page : { ...page, elements };
      }),
    );
  },

  setLocked: (ids, locked) => get().updateElements(ids, { locked }),

  flip: (ids, axis) => {
    const { currentPageId } = get();
    applyProjectChange(set, get, (project) =>
      withElements(project, currentPageId, ids, (element) =>
        axis === "x" ? { ...element, flipX: !element.flipX } : { ...element, flipY: !element.flipY },
      ),
    );
  },

  nudge: (ids, dx, dy) => {
    if (ids.length === 0 || (dx === 0 && dy === 0)) return;
    const { currentPageId } = get();
    applyProjectChange(set, get, (project) =>
      withElements(project, currentPageId, ids, (element) =>
        element.locked ? element : { ...element, x: element.x + dx, y: element.y + dy },
      ),
    );
  },

  copy: (ids) => {
    const { project, currentPageId } = get();
    const page = project ? findPage(project, currentPageId) : undefined;
    if (!page) return;
    const wanted = new Set(ids);
    const copied = page.elements.filter((element) => wanted.has(element.id)).map((e) => structuredClone(e));
    // Copying nothing keeps whatever was copied before.
    if (copied.length > 0) set({ clipboard: copied });
  },

  paste: () => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;
    get().addElements(clipboard.map((element) => cloneElement(element, DUPLICATE_OFFSET)), true);
  },
});
