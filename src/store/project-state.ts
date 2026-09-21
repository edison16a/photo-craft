/**
 * Shape of the editor store and the helper every mutating action goes
 * through. Actions live in `slices/`, this file only defines state.
 */
import type { StateCreator } from "zustand";
import type { CanvasElement, Project } from "../model/types";
import { emptyHistory, pushHistory, type History } from "./history";
import type { ElementActions } from "./slices/element-slice";
import type { HistoryActions } from "./slices/history-slice";
import type { PageActions } from "./slices/page-slice";
import type { SelectionActions } from "./slices/selection-slice";

/** What an undo step restores: the project plus where the user was. */
export interface EditorSnapshot {
  project: Project;
  currentPageId: string;
  selectedIds: string[];
}

export interface ProjectState {
  project: Project | null;
  currentPageId: string;
  selectedIds: string[];
  history: History<EditorSnapshot>;
  /** True when there are changes that have not been saved. */
  dirty: boolean;
  /** Time of the last successful save, or null. */
  savedAt: number | null;
  clipboard: CanvasElement[];
}

export type ProjectStore = ProjectState &
  PageActions &
  ElementActions &
  SelectionActions &
  HistoryActions;

export type Slice<T> = StateCreator<ProjectStore, [], [], T>;

export function initialProjectState(): ProjectState {
  return {
    project: null,
    currentPageId: "",
    selectedIds: [],
    history: emptyHistory(),
    dirty: false,
    savedAt: null,
    clipboard: [],
  };
}

type SetState = (partial: Partial<ProjectState>) => void;
type GetState = () => ProjectStore;

/**
 * Applies a pure transform to the current project. Records an undo step and
 * marks the project dirty unless the change is quiet. Does nothing when the transform
 * returns the same object, so callers can bail out cheaply.
 */
export function applyProjectChange(
  set: SetState,
  get: GetState,
  transform: (project: Project) => Project,
  options: { quiet?: boolean; selectedIds?: string[]; currentPageId?: string } = {},
): void {
  const { project, currentPageId, selectedIds, history, dirty } = get();
  if (!project) return;
  const next = transform(project);
  if (next === project) return;

  // Quiet changes are derived values (like a measured text height). They
  // do not create an undo step and do not count as unsaved work.
  const quiet = options.quiet ?? false;
  set({
    project: quiet ? next : { ...next, updatedAt: Date.now() },
    history: quiet ? history : pushHistory(history, { project, currentPageId, selectedIds }),
    dirty: quiet ? dirty : true,
    currentPageId: options.currentPageId ?? currentPageId,
    selectedIds: options.selectedIds ?? selectedIds,
  });
}
