/**
 * Saving and loading projects from the browser's IndexedDB.
 *
 * Full projects (with image data) live in the "projects" store. A small
 * summary per project lives in "summaries" so the home screen can list
 * projects without reading every image.
 */
import { isIndexedDbAvailable, openKeyValueStore } from "../lib/idb";
import { duplicateProject, summarizeProject } from "../model/project-factories";
import type { Project, ProjectSummary } from "../model/types";

const projects = () => openKeyValueStore<Project>("projects");
const summaries = () => openKeyValueStore<ProjectSummary>("summaries");

/** Human readable message when storage is missing, for example in private mode. */
export const STORAGE_UNAVAILABLE_MESSAGE =
  "This browser does not allow local storage, so projects cannot be saved.";

function assertStorage(): void {
  if (!isIndexedDbAvailable()) throw new Error(STORAGE_UNAVAILABLE_MESSAGE);
}

/** Writes the project and its summary. The thumbnail is optional. */
export async function saveProject(project: Project, thumbnail?: string): Promise<void> {
  assertStorage();
  const existing = await summaries().get(project.id);
  await projects().set(project.id, project);
  await summaries().set(project.id, summarizeProject(project, thumbnail ?? existing?.thumbnail));
}

/** Reads a full project, or undefined when it does not exist. */
export async function loadProject(id: string): Promise<Project | undefined> {
  assertStorage();
  return projects().get(id);
}

/** All project summaries, newest first. */
export async function listProjects(): Promise<ProjectSummary[]> {
  if (!isIndexedDbAvailable()) return [];
  const all = await summaries().getAll();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Removes a project and its summary. */
export async function deleteProject(id: string): Promise<void> {
  assertStorage();
  await projects().remove(id);
  await summaries().remove(id);
}

/** Renames a stored project without opening it in the editor. */
export async function renameStoredProject(id: string, name: string): Promise<void> {
  const project = await loadProject(id);
  if (!project) return;
  await saveProject({ ...project, name, updatedAt: Date.now() });
}

/** Copies a stored project under a new ID and returns the copy. */
export async function duplicateStoredProject(id: string): Promise<Project | undefined> {
  const project = await loadProject(id);
  if (!project) return undefined;
  const copy = duplicateProject(project);
  const summary = await summaries().get(id);
  await saveProject(copy, summary?.thumbnail);
  return copy;
}
