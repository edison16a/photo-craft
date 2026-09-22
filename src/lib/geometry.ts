/**
 * Pure math for boxes and rotation. Nothing in here touches the DOM or
 * Konva, so the store, the renderer, snapping and the export code can all
 * share it. Angles are in degrees and turn clockwise, which is how elements
 * store their rotation and how Konva draws it.
 */

import type { Point, Rect } from "../model/types";

/**
 * Smallest zoom fitScale will hand back. It keeps a viewport that is
 * smaller than its own padding from collapsing the canvas to nothing.
 */
const MIN_FIT_SCALE = 0.01;

/** Exact cosine and sine for 0, 90, 180 and 270 degrees, in that order. */
const QUARTER_TURNS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/** Converts degrees to radians, which is what Math.sin and Math.cos want. */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Converts radians back to degrees for storing or showing to the user. */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Brings any angle into the range 0 (inclusive) to 360 (exclusive), so
 * -90 becomes 270 and 450 becomes 90. NaN and infinite input come back
 * as 0 rather than poisoning later math.
 */
export function normalizeDegrees(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  const wrapped = ((deg % 360) + 360) % 360;
  return wrapped === 0 ? 0 : wrapped;
}

/**
 * Keeps value between min and max. Anything below min becomes min and
 * anything above max becomes max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Centre point of a box. It is also the point elements rotate around. */
export function centerOf(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * Cosine and sine of an angle given in degrees. Multiples of 90 come back
 * exact, because Math.cos(Math.PI / 2) is a hair above zero and that hair
 * would put quarter turned boxes on fractional pixels.
 */
function cosSinDeg(deg: number): { cos: number; sin: number } {
  const normalized = normalizeDegrees(deg);
  const quarter = normalized / 90;
  if (Number.isInteger(quarter)) {
    const [cos, sin] = QUARTER_TURNS[quarter];
    return { cos, sin };
  }
  const rad = degToRad(normalized);
  return { cos: Math.cos(rad), sin: Math.sin(rad) };
}

/**
 * Axis aligned box that fully covers rect after rotating it around its
 * own centre. Selection outlines, snapping and "fit to content" all work
 * on upright boxes, so this is how they see a rotated element. Rotating
 * by 90 swaps width and height. Rotating by 0 or 180 gives the same box.
 */
export function rotatedBoundingBox(rect: Rect, rotationDeg: number): Rect {
  const { cos, sin } = cosSinDeg(rotationDeg);
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  const boxHalfWidth = Math.abs(halfWidth * cos) + Math.abs(halfHeight * sin);
  const boxHalfHeight = Math.abs(halfWidth * sin) + Math.abs(halfHeight * cos);
  const center = centerOf(rect);
  return {
    x: center.x - boxHalfWidth,
    y: center.y - boxHalfHeight,
    width: boxHalfWidth * 2,
    height: boxHalfHeight * 2,
  };
}

/**
 * Top left for a box that changes size but must keep its rotated top left
 * corner where it is on the page. Elements rotate around their centre, so
 * growing a rotated box while leaving x and y alone swings that corner
 * away. Text uses this when its measured height changes, so a rotated
 * text grows along its own down direction instead of jumping.
 */
export function resizeKeepingCorner(rect: Rect, rotationDeg: number, width: number, height: number): Point {
  const { cos, sin } = cosSinDeg(rotationDeg);
  const halfGrowthX = (width - rect.width) / 2;
  const halfGrowthY = (height - rect.height) / 2;
  // The centre moves by the half growth in page space, and the corner
  // moves by the half growth rotated. The difference is the drift.
  return {
    x: rect.x - (halfGrowthX - (halfGrowthX * cos - halfGrowthY * sin)),
    y: rect.y - (halfGrowthY - (halfGrowthX * sin + halfGrowthY * cos)),
  };
}

/**
 * Smallest box that contains every box in the list. An empty list gives a
 * zero sized box at the origin so callers do not have to special case it.
 */
export function unionRects(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const rect of rects) {
    left = Math.min(left, rect.x);
    top = Math.min(top, rect.y);
    right = Math.max(right, rect.x + rect.width);
    bottom = Math.max(bottom, rect.y + rect.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * True when the two boxes overlap by some positive area. Boxes that only
 * share an edge or a corner do not count, which is what marquee selection
 * wants.
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** True when the point is inside the box. Points right on an edge count as inside. */
export function rectContainsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Zoom level that makes the content fit inside the viewport with padding
 * pixels of breathing room on every side. Small content gets scaled up and
 * large content gets scaled down. The result is always a positive number,
 * even when the viewport is smaller than the padding, so dividing by it is
 * safe. Content with no size gets a scale of 1.
 */
export function fitScale(
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 0,
): number {
  if (contentWidth <= 0 || contentHeight <= 0) return 1;
  const availableWidth = viewportWidth - padding * 2;
  const availableHeight = viewportHeight - padding * 2;
  const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
  if (!Number.isFinite(scale) || scale <= 0) return MIN_FIT_SCALE;
  return scale;
}

/**
 * Shrinks a size so it fits inside maxWidth by maxHeight while keeping its
 * aspect ratio. A size that already fits comes back unchanged, this never
 * makes anything bigger. A side that is zero stays zero and the other side
 * is still fitted. Handy for thumbnails and previews.
 */
export function scaleToFit(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratios: number[] = [];
  if (width > 0) ratios.push(maxWidth / width);
  if (height > 0) ratios.push(maxHeight / height);
  if (ratios.length === 0) return { width, height };
  const ratio = clamp(Math.min(...ratios), 0, 1);
  return { width: width * ratio, height: height * ratio };
}

/**
 * Rounds to a fixed number of decimal places, none by default, so 33.3333
 * shows as 33.33 in the inspector. Halves round up. Never returns negative
 * zero, and NaN or infinite input is returned as is.
 */
export function roundTo(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}
