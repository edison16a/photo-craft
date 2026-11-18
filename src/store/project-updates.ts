/**
 * Pure helpers that return an updated copy of a project.
 *
 * Nothing here mutates its input. Every helper rebuilds only the path it
 * touches (project, page, element) so untouched pages and elements keep
 * their identity. That keeps React renders and undo snapshots cheap.
 */
import { restack, type StackDirection } from "../lib/stack-order";
import type { CanvasElement, Page, Project } from "../model/types";

export type { StackDirection };

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
 * Replaces a page's element list using a transform. Hands back the same
 * project when the transform returns the list it was given.
 */
export function withPageElements(
  project: Project,
  pageId: string,
  transform: (elements: CanvasElement[]) => CanvasElement[],
): Project {
  return withPage(project, pageId, (page) => {
    const elements = transform(page.elements);
    return elements === page.elements ? page : { ...page, elements };
  });
}

/**
 * Merges a patch into an element, or returns the element itself when every
 * patched field already has that value.
 */
export function patchElement(element: CanvasElement, patch: Partial<CanvasElement>): CanvasElement {
  const record = element as unknown as Record<string, unknown>;
  const entries = Object.entries(patch);
  if (entries.every(([key, value]) => sameValue(record[key], value))) return element;
  return { ...element, ...patch } as CanvasElement;
}

/**
 * Equality for element fields: identity for most, key by key for a plain
 * object such as a colour adjustment, so a fresh copy with the same values
 * does not count as a change and does not leave an empty undo step.
 */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every((key) => key in b && a[key] === b[key]);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

/**
 * Moves elements up or down the stacking order. Groups move as one block
 * and members picked out of a group stay inside it, see restack.
 */
export function reorderElements(
  project: Project,
  pageId: string,
  ids: readonly string[],
  direction: StackDirection,
): Project {
  return withPageElements(project, pageId, (elements) => restack(elements, ids, direction));
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
