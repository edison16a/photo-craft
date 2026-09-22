"use client";
/**
 * Saves the open project to IndexedDB together with a thumbnail of the
 * first page, and reports the result through a toast.
 */
import { useCallback, useState } from "react";
import { renderThumbnail } from "../lib/export/thumbnail";
import { useEditorUiStore } from "../store/editor-ui-store";
import { saveProject } from "../store/persistence";
import { useProjectStore } from "../store/project-store";

/** Saves run one after another so an older snapshot can never overwrite a newer one. */
let queue: Promise<unknown> = Promise.resolve();

async function writeCurrentProject(quiet: boolean): Promise<boolean> {
  const { project, markSaved } = useProjectStore.getState();
  const { showToast } = useEditorUiStore.getState();
  if (!project) return false;
  try {
    let thumbnail: string | undefined;
    try {
      thumbnail = await renderThumbnail(project, project.pages[0]);
    } catch {
      // A thumbnail is nice to have. Saving must not fail because of it.
    }
    await saveProject(project, thumbnail);
    // Only the snapshot that was written counts as saved. Edits made in the
    // meantime keep the project dirty so the next save picks them up.
    markSaved(project);
    if (!quiet) showToast("Project saved");
    return true;
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Could not save the project", "error");
    return false;
  }
}

/** Returns a save function and whether a save is running. */
export function useSaveProject(): { save: (quiet?: boolean) => Promise<boolean>; saving: boolean } {
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (quiet = false) => {
    setSaving(true);
    const run = () => writeCurrentProject(quiet);
    const result = queue.then(run, run);
    queue = result.catch(() => undefined);
    try {
      return await result;
    } finally {
      setSaving(false);
    }
  }, []);

  return { save, saving };
}
