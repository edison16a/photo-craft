"use client";
/**
 * The colours already used in the open project: every colour set on text,
 * shapes and page backgrounds, plus the colours that stand out in each
 * image. Shown at the top of every colour picker.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { getImageColors } from "../lib/image-colors";
import { collectElementColors, collectImageSources } from "../store/project-colors";
import { useProjectStore } from "../store/project-store";

const EMPTY: string[] = [];

function dedupe(colors: string[]): string[] {
  return [...new Set(colors)];
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/** Keeps the previous array while its items are unchanged, so effects keyed on it stay quiet. */
function useStableList(list: string[]): string[] {
  const previous = useRef(list);
  if (!sameList(previous.current, list)) previous.current = list;
  return previous.current;
}

/** Project colours in order: element colours first, then image colours. */
export function useProjectColors(): string[] {
  const project = useProjectStore((s) => s.project);
  const elementColors = useStableList(useMemo(() => (project ? collectElementColors(project) : EMPTY), [project]));
  const sources = useStableList(useMemo(() => (project ? collectImageSources(project) : EMPTY), [project]));
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
