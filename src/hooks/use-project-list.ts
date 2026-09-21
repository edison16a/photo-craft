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

  const rename = useCallback(
    async (id: string, name: string) => {
      await renameStoredProject(id, name);
      await refresh();
    },
    [refresh],
  );

  const duplicate = useCallback(
    async (id: string) => {
      await duplicateStoredProject(id);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteProject(id);
      await refresh();
    },
    [refresh],
  );

  return { projects, loading, error, refresh, rename, duplicate, remove };
}
