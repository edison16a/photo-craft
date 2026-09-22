/**
 * Reads back the colours and pictures a project already uses.
 *
 * The colour picker shows these first as "Project colours" so a user can
 * reuse a shade they picked earlier, or one pulled out of a photo on the
 * page, without hunting through the full palette.
 */
import { normalizeHex } from "../data/colors";
import type { Project } from "../model/types";

/** Adds a colour to the list once, after cleaning it up. Rejected values are skipped. */
function addColor(seen: Set<string>, colors: string[], value: string): void {
  // "transparent", rgb() strings and anything else that is not a hex
  // colour come back from normalizeHex as "" and are left out.
  const hex = normalizeHex(value);
  if (!hex || seen.has(hex)) return;
  seen.add(hex);
  colors.push(hex);
}

/**
 * Pure. Every CSS colour used by the project's own elements, in order of
 * first use, without duplicates and without "transparent": page
 * backgrounds, shape fills and strokes (skip a stroke when strokeWidth is
 * 0), text fills. Values are normalised to lowercase #rrggbb with
 * normalizeHex; anything normalizeHex rejects is skipped.
 */
export function collectElementColors(project: Project): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const page of project.pages) {
    addColor(seen, colors, page.background);
    for (const element of page.elements) {
      if (element.type === "text") {
        addColor(seen, colors, element.fill);
      } else if (element.type === "shape") {
        addColor(seen, colors, element.fill);
        if (element.strokeWidth > 0) addColor(seen, colors, element.stroke);
      }
    }
  }
  return colors;
}

/** Pure. Data URLs of every distinct image in the project, in order of first use. */
export function collectImageSources(project: Project): string[] {
  const seen = new Set<string>();
  const sources: string[] = [];
  for (const page of project.pages) {
    for (const element of page.elements) {
      if (element.type !== "image" || seen.has(element.src)) continue;
      seen.add(element.src);
      sources.push(element.src);
    }
  }
  return sources;
}
