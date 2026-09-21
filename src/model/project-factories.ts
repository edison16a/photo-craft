import { createId } from "./ids";
import type { Page, Project, ProjectSummary } from "./types";

/** Creates an empty white page. */
export function createPage(name = "Page 1"): Page {
  return {
    id: createId("page"),
    name,
    background: "#ffffff",
    elements: [],
  };
}

/** Creates a project with a single empty page. */
export function createProject(name: string, width: number, height: number): Project {
  const now = Date.now();
  return {
    id: createId("proj"),
    name,
    width: Math.round(width),
    height: Math.round(height),
    pages: [createPage()],
    createdAt: now,
    updatedAt: now,
  };
}

/** Deep copies a page, including its elements, under a fresh ID. */
export function duplicatePage(page: Page, name?: string): Page {
  const copy = structuredClone(page);
  copy.id = createId("page");
  copy.name = name ?? `${page.name} copy`;
  copy.elements = copy.elements.map((element) => ({ ...element, id: createId("el") }));
  return copy;
}

/** Deep copies a whole project under a fresh ID. */
export function duplicateProject(project: Project, name?: string): Project {
  const now = Date.now();
  return {
    ...structuredClone(project),
    id: createId("proj"),
    name: name ?? `${project.name} copy`,
    pages: project.pages.map((page) => duplicatePage(page, page.name)),
    createdAt: now,
    updatedAt: now,
  };
}

/** Builds the home screen summary for a project. */
export function summarizeProject(project: Project, thumbnail?: string): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    width: project.width,
    height: project.height,
    pageCount: project.pages.length,
    updatedAt: project.updatedAt,
    thumbnail,
  };
}

/** Picks the next unused "Page N" name for a project. */
export function nextPageName(project: Project): string {
  let n = project.pages.length + 1;
  const taken = new Set(project.pages.map((page) => page.name));
  while (taken.has(`Page ${n}`)) n += 1;
  return `Page ${n}`;
}
