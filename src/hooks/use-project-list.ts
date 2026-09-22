"use client";
/**
 * Project list for the home screen, with rename, duplicate and delete.
 */
import { useCallback, useEffect, useState } from "react";
import type { ProjectSummary } from "@/model/types";
import { deleteProject, duplicateStoredProject, listProjects, renameStoredProject } from "@/store/persistence";

export function useProjectList() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      setProjects(await listProjects());
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read saved projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Runs a storage action, reports a failure through `error` and refreshes either way. */
  const perform = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update the project");
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const rename = useCallback((id: string, name: string) => perform(() => renameStoredProject(id, name)), [perform]);
  const duplicate = useCallback((id: string) => perform(() => duplicateStoredProject(id)), [perform]);
  const remove = useCallback((id: string) => perform(() => deleteProject(id)), [perform]);

  return { projects, loading, error, refresh, rename, duplicate, remove };
}
