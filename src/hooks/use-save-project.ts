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

export function useSaveProject(): { save: (quiet?: boolean) => Promise<boolean>; saving: boolean } {
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (quiet = false) => {
    const { project, markSaved } = useProjectStore.getState();
    const { showToast } = useEditorUiStore.getState();
    if (!project) return false;
    setSaving(true);
    try {
      let thumbnail: string | undefined;
      try {
        thumbnail = await renderThumbnail(project, project.pages[0]);
      } catch {
        // A thumbnail is nice to have. Saving must not fail because of it.
      }
      await saveProject(project, thumbnail);
      markSaved();
      if (!quiet) showToast("Project saved");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save the project", "error");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { save, saving };
}
