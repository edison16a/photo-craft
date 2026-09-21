/**
 * Alignment guides while dragging an element around the page.
 *
 * The idea is simple. The page has three interesting lines per axis (left,
 * centre, right and top, middle, bottom) and so does every other element on
 * the page. While a box is being dragged we compare its own three lines with
 * all of those candidates. If one pair is close enough we nudge the box so
 * the lines meet exactly and report a guide at that position so the canvas
 * can draw the familiar thin line.
 *
 * Everything here is pure math in page pixels. It has no idea about zoom or
 * rotation. Callers pass axis aligned boxes (use the rotated bounding box for
 * rotated elements) and add the returned dx and dy to the dragged position.
 */
import type { Rect } from "../model/types";

/** One thin line to draw on the canvas. `position` is in page pixels. */
export interface Guide {
  orientation: "vertical" | "horizontal";
  position: number;
}

/**
 * What to add to the moving box so it lands on the guides. A zero means that
 * axis did not snap and has no guide.
 */
export interface SnapResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

/**
 * Everything the snapper needs to know about the page. `targets` are the
 * axis aligned boxes of the elements that are not being moved. `threshold`
 * is the largest distance in page pixels that still snaps.
 */
export interface SnapContext {
  pageWidth: number;
  pageHeight: number;
  targets: Rect[];
  threshold: number;
}

/**
 * Best match found for one axis while scanning candidates. `delta` is what
 * to add to the moving box, `line` is the candidate it landed on.
 */
interface AxisMatch {
  delta: number;
  line: number;
}

/**
 * Start, centre and end of a one dimensional span. For the x axis this is
 * left, centre, right. For y it is top, middle, bottom.
 */
function spanLines(start: number, size: number): number[] {
  return [start, start + size / 2, start + size];
}

/** Keeps the first occurrence of each value so guides never double up. */
function uniqueInOrder(values: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/**
 * Lists every line the moving box could snap to. Page lines come first, then
 * each target's lines in order. Duplicates are dropped, the first one wins.
 * Useful on its own when the canvas wants to draw all possible guides, or
 * for debugging why something did or did not snap.
 */
export function collectSnapLines(context: SnapContext): {
  vertical: number[];
  horizontal: number[];
} {
  const vertical = spanLines(0, context.pageWidth);
  const horizontal = spanLines(0, context.pageHeight);
  for (const target of context.targets) {
    vertical.push(...spanLines(target.x, target.width));
    horizontal.push(...spanLines(target.y, target.height));
  }
  return {
    vertical: uniqueInOrder(vertical),
    horizontal: uniqueInOrder(horizontal),
  };
}

/**
 * Finds the closest candidate for one axis. Every line of the moving span is
 * compared with every candidate. The smallest absolute distance within the
 * threshold wins. When two matches are equally close the one that lands on
 * the page centre is preferred, because centring is what people usually want.
 * Returns undefined when nothing is close enough.
 */
function findAxisMatch(
  movingLines: number[],
  candidates: number[],
  pageCentre: number,
  threshold: number,
): AxisMatch | undefined {
  let best: AxisMatch | undefined;
  for (const line of candidates) {
    for (const own of movingLines) {
      const delta = line - own;
      const distance = Math.abs(delta);
      if (distance > threshold) continue;
      if (!best) {
        best = { delta, line };
        continue;
      }
      const bestDistance = Math.abs(best.delta);
      const closer = distance < bestDistance;
      const tieOnCentre =
        distance === bestDistance && line === pageCentre && best.line !== pageCentre;
      if (closer || tieOnCentre) best = { delta, line };
    }
  }
  return best;
}

/**
 * Works out how far to nudge a box being dragged so it lines up with the
 * page or with other elements. Each axis is handled on its own, so a box can
 * snap horizontally to one element and vertically to another. Add the
 * returned dx and dy to the box position and draw the guides. When nothing
 * is within the threshold on an axis that delta is 0 and there is no guide
 * for it.
 */
export function computeSnap(moving: Rect, context: SnapContext): SnapResult {
  const lines = collectSnapLines(context);
  const xMatch = findAxisMatch(
    spanLines(moving.x, moving.width),
    lines.vertical,
    context.pageWidth / 2,
    context.threshold,
  );
  const yMatch = findAxisMatch(
    spanLines(moving.y, moving.height),
    lines.horizontal,
    context.pageHeight / 2,
    context.threshold,
  );

  const guides: Guide[] = [];
  if (xMatch) guides.push({ orientation: "vertical", position: xMatch.line });
  if (yMatch) guides.push({ orientation: "horizontal", position: yMatch.line });

  return {
    dx: xMatch ? xMatch.delta : 0,
    dy: yMatch ? yMatch.delta : 0,
    guides,
  };
}
