/**
 * Turning the corners placed with the draw tool into a custom shape
 * element: the box around them and the corners as fractions of it.
 */
import type { ShapeElement } from "../model/types";

/** Corners closer than this, in page pixels, count as the same corner. */
const SAME_CORNER = 0.5;

/** What the draw tool lets the user choose. */
export interface DrawOptions {
  /** Curved sides run a smooth line through the corners. */
  curved: boolean;
  /** Whether the outline joins back to its start. */
  closed: boolean;
}

/** Tension Konva uses for curved custom shapes. */
export const CURVE_TENSION = 0.5;

/** The smallest box a drawn shape can have, so a dot still exists. */
const MIN_SIDE = 1;

/** Drops a corner that repeats the one before it, as a double click leaves behind. */
export function dedupePoints(points: number[]): number[] {
  const result: number[] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    const x = points[index];
    const y = points[index + 1];
    const lastX = result[result.length - 2];
    const lastY = result[result.length - 1];
    if (result.length > 0 && Math.abs(x - lastX) < SAME_CORNER && Math.abs(y - lastY) < SAME_CORNER) continue;
    result.push(x, y);
  }
  return result;
}

/** How many corners a shape needs before it can be finished. */
export function cornersNeeded(options: DrawOptions): number {
  return options.closed ? 3 : 2;
}

/**
 * The parts of a custom shape element that come from the drawn corners:
 * position, size and the corners as fractions of the box. Returns null
 * when there are not enough corners.
 */
export function shapeFromPoints(points: number[], options: DrawOptions): Pick<ShapeElement, "x" | "y" | "width" | "height" | "points" | "closed" | "tension"> | null {
  const corners = dedupePoints(points);
  if (corners.length / 2 < cornersNeeded(options)) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < corners.length; index += 2) {
    minX = Math.min(minX, corners[index]);
    maxX = Math.max(maxX, corners[index]);
    minY = Math.min(minY, corners[index + 1]);
    maxY = Math.max(maxY, corners[index + 1]);
  }
  const width = Math.max(MIN_SIDE, maxX - minX);
  const height = Math.max(MIN_SIDE, maxY - minY);
  const fractions: number[] = [];
  for (let index = 0; index < corners.length; index += 2) {
    fractions.push(Math.round(((corners[index] - minX) / width) * 10000) / 10000, Math.round(((corners[index + 1] - minY) / height) * 10000) / 10000);
  }
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.round(width),
    height: Math.round(height),
    points: fractions,
    closed: options.closed,
    tension: options.curved ? CURVE_TENSION : 0,
  };
}
