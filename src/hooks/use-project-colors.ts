"use client";
/**
 * The colours already used in the open project: every colour set on text,
 * shapes and page backgrounds, plus the colours that stand out in each
 * image. Shown at the top of every colour picker.
 */
import { useEffect, useMemo, useState } from "react";
import { getImageColors } from "../lib/image-colors";
import { collectElementColors, collectImageSources } from "../store/project-colors";
import { useProjectStore } from "../store/project-store";

const EMPTY: string[] = [];

function dedupe(colors: string[]): string[] {
  return [...new Set(colors)];
}

/** Project colours in order: element colours first, then image colours. */
export function useProjectColors(): string[] {
  const project = useProjectStore((s) => s.project);
  const elementColors = useMemo(() => (project ? collectElementColors(project) : EMPTY), [project]);
  const sources = useMemo(() => (project ? collectImageSources(project) : EMPTY), [project]);
  const [imageColors, setImageColors] = useState<string[]>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    if (sources.length === 0) {
      setImageColors(EMPTY);
      return;
    }
    Promise.all(sources.map((src) => getImageColors(src))).then((lists) => {
      if (!cancelled) setImageColors(dedupe(lists.flat()));
    });
    return () => {
      cancelled = true;
    };
  }, [sources]);

  return useMemo(() => dedupe([...elementColors, ...imageColors]), [elementColors, imageColors]);
}
