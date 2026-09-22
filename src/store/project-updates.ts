/**
 * Pure helpers that return an updated copy of a project.
 *
 * Nothing here mutates its input. Every helper rebuilds only the path it
 * touches (project, page, element) so untouched pages and elements keep
 * their identity. That keeps React renders and undo snapshots cheap.
 */
import type { CanvasElement, Page, Project } from "../model/types";

/** Finds a page by ID. */
export function findPage(project: Project, pageId: string): Page | undefined {
  return project.pages.find((page) => page.id === pageId);
}

/**
 * Replaces one page using a transform function. Returns the same project
 * when the transform hands the page back unchanged, so callers can tell a
 * real change from a no-op.
 */
export function withPage(
  project: Project,
  pageId: string,
  transform: (page: Page) => Page,
): Project {
  let changed = false;
  const pages = project.pages.map((page) => {
    if (page.id !== pageId) return page;
    const next = transform(page);
    if (next !== page) changed = true;
    return next;
  });
  return changed ? { ...project, pages } : project;
}

/**
 * Applies a transform to every element on a page whose ID is in the set.
 * Elements the transform returns unchanged are kept as they are, and when
 * nothing changed the same project comes back.
 */
export function withElements(
  project: Project,
  pageId: string,
  ids: readonly string[],
  transform: (element: CanvasElement) => CanvasElement,
): Project {
  const wanted = new Set(ids);
  return withPage(project, pageId, (page) => {
    let changed = false;
    const elements = page.elements.map((element) => {
      if (!wanted.has(element.id)) return element;
      const next = transform(element);
      if (next !== element) changed = true;
      return next;
    });
    return changed ? { ...page, elements } : page;
  });
}

/**
 * Merges a patch into an element, or returns the element itself when every
 * patched field already has that value.
 */
export function patchElement(element: CanvasElement, patch: Partial<CanvasElement>): CanvasElement {
  const record = element as unknown as Record<string, unknown>;
  const entries = Object.entries(patch);
  if (entries.every(([key, value]) => record[key] === value)) return element;
  return { ...element, ...patch } as CanvasElement;
}

/** Appends elements to the top of a page's stacking order. */
export function addElementsToPage(
  project: Project,
  pageId: string,
  elements: CanvasElement[],
): Project {
  return withPage(project, pageId, (page) => ({
    ...page,
    elements: [...page.elements, ...elements],
  }));
}

/** Removes elements from a page. */
export function removeElementsFromPage(
  project: Project,
  pageId: string,
  ids: readonly string[],
): Project {
  const doomed = new Set(ids);
  return withPage(project, pageId, (page) => ({
    ...page,
    elements: page.elements.filter((element) => !doomed.has(element.id)),
  }));
}

/** How far to move elements in the stacking order. */
export type StackDirection = "forward" | "backward" | "front" | "back";

/**
 * Moves elements up or down the stacking order. "forward" and "backward"
 * step one place past the nearest unselected neighbour. "front" and "back"
 * move the whole group to the end or start while keeping its own order.
 */
export function reorderElements(
  project: Project,
  pageId: string,
  ids: readonly string[],
  direction: StackDirection,
): Project {
  const moving = new Set(ids);
  return withPage(project, pageId, (page) => {
    const selected = page.elements.filter((element) => moving.has(element.id));
    const others = page.elements.filter((element) => !moving.has(element.id));
    if (selected.length === 0) return page;

    if (direction === "front") return { ...page, elements: [...others, ...selected] };
    if (direction === "back") return { ...page, elements: [...selected, ...others] };

    const elements = [...page.elements];
    if (direction === "forward") {
      for (let i = elements.length - 2; i >= 0; i -= 1) {
        if (moving.has(elements[i].id) && !moving.has(elements[i + 1].id)) {
          [elements[i], elements[i + 1]] = [elements[i + 1], elements[i]];
        }
      }
    } else {
      for (let i = 1; i < elements.length; i += 1) {
        if (moving.has(elements[i].id) && !moving.has(elements[i - 1].id)) {
          [elements[i], elements[i - 1]] = [elements[i - 1], elements[i]];
        }
      }
    }
    const moved = elements.some((element, index) => element !== page.elements[index]);
    return moved ? { ...page, elements } : page;
  });
}

/** Replaces the page list, used for adding, deleting and moving pages. */
export function withPages(project: Project, pages: Page[]): Project {
  return { ...project, pages };
}

/** Moves a page one step left or right in the page list. */
export function movePage(project: Project, pageId: string, delta: -1 | 1): Project {
  const index = project.pages.findIndex((page) => page.id === pageId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= project.pages.length) return project;
  const pages = [...project.pages];
  [pages[index], pages[target]] = [pages[target], pages[index]];
  return withPages(project, pages);
}
