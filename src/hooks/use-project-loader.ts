"use client";
/**
 * Loads a project from storage into the editor store when the editor route
 * opens, and clears the store when it closes.
 */
import { useEffect, useState } from "react";
import { ensureFontsLoaded } from "../lib/font-loader";
import type { Project } from "../model/types";
import { loadProject } from "../store/persistence";
import { useProjectStore } from "../store/project-store";

export type LoadStatus = "loading" | "ready" | "missing" | "error";

/** Every font family a project uses, so we can preload before first paint. */
export function fontsUsedBy(project: Project): string[] {
  const families = new Set<string>();
  for (const page of project.pages) {
    for (const element of page.elements) {
      if (element.type === "text") families.add(element.fontFamily);
    }
  }
  return [...families];
}

export function useProjectLoader(projectId: string): { status: LoadStatus; error?: string } {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    loadProject(projectId)
      .then(async (project) => {
        if (cancelled) return;
        if (!project) {
          setStatus("missing");
          return;
        }
        await ensureFontsLoaded(fontsUsedBy(project));
        if (cancelled) return;
        useProjectStore.getState().loadProject(project);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
      useProjectStore.getState().closeProject();
    };
  }, [projectId]);

  return { status, error };
}
