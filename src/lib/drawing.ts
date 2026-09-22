/**
 * The draw tool's maths: snapping corners to the grid, and turning the
 * corners placed into a custom shape element (the box around them and the
 * corners as fractions of it).
 */
import type { Point, ShapeElement } from "../model/types";

/** Corners closer than this, in page pixels, count as the same corner. */
const SAME_CORNER = 0.5;

/** Grid spacings the draw tool offers, in page pixels. */
export const GRID_SIZES = [10, 20, 40, 80] as const;

/** What the draw tool lets the user choose. */
export interface DrawOptions {
  /** Whether the outline joins back to its start. */
  closed: boolean;
  /** Spacing of the grid the corners snap to, in page pixels. */
  grid: number;
  /** Round every corner as the shape is drawn, so a staircase becomes a curve. */
  smooth: boolean;
}

/** The corner rounding a smoothed shape gets, in page pixels. */
export function smoothRadius(options: DrawOptions): number {
  return options.smooth ? options.grid : 0;
}

/**
 * Drops corners that sit on a straight run between their neighbours, as
 * a drag along a grid line leaves behind. For a closed outline the run
 * may wrap around the start.
 */
export function dropCollinear(points: number[], closed: boolean): number[] {
  const count = Math.floor(points.length / 2);
  if (count < 3) return points.slice(0, count * 2);
  const keep: boolean[] = [];
  for (let index = 0; index < count; index += 1) {
    const isEnd = !closed && (index === 0 || index === count - 1);
    if (isEnd) {
      keep.push(true);
      continue;
    }
    const prev = ((index - 1) % count + count) % count;
    const next = (index + 1) % count;
    const ax = points[index * 2] - points[prev * 2];
    const ay = points[index * 2 + 1] - points[prev * 2 + 1];
    const bx = points[next * 2] - points[index * 2];
    const by = points[next * 2 + 1] - points[index * 2 + 1];
    const straightOn = Math.abs(ax * by - ay * bx) < 1e-6 && ax * bx + ay * by > 0;
    keep.push(!straightOn);
  }
  const result: number[] = [];
  for (let index = 0; index < count; index += 1) {
    if (keep[index]) result.push(points[index * 2], points[index * 2 + 1]);
  }
  return result;
}

/** The smallest box a drawn shape can have, so a dot still exists. */
const MIN_SIDE = 1;

/** Moves a point to the nearest grid crossing. A grid of 0 or less leaves it alone. */
export function snapToGrid(point: Point, grid: number): Point {
  if (!(grid > 0)) return point;
  return { x: Math.round(point.x / grid) * grid, y: Math.round(point.y / grid) * grid };
}

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

/**
 * True when a new corner carries straight on from the last two, so the
 * last corner can simply move to it instead of a new one being added.
 */
export function extendsStraightRun(points: number[], point: Point): boolean {
  if (points.length < 4) return false;
  const [x1, y1, x2, y2] = points.slice(-4);
  const ax = x2 - x1;
  const ay = y2 - y1;
  const bx = point.x - x2;
  const by = point.y - y2;
  return Math.abs(ax * by - ay * bx) < 1e-6 && ax * bx + ay * by > 0;
}

/** How many corners a shape needs before it can be finished. */
export function cornersNeeded(options: DrawOptions): number {
  return options.closed ? 3 : 2;
}

/**
 * The parts of a custom shape element that come from the drawn corners:
 * position, size, the corners as fractions of the box and the rounding
 * the smooth option asks for. Corners on straight runs are dropped first.
 * Returns null when there are not enough corners.
 */
export function shapeFromPoints(points: number[], options: DrawOptions): Pick<ShapeElement, "x" | "y" | "width" | "height" | "points" | "closed" | "cornerRadius"> | null {
  const corners = dropCollinear(dedupePoints(points), options.closed);
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
    fractions.push(Math.round(((corners[index] - minX) / width) * 1e6) / 1e6, Math.round(((corners[index + 1] - minY) / height) * 1e6) / 1e6);
  }
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.round(width),
    height: Math.round(height),
    points: fractions,
    closed: options.closed,
    cornerRadius: smoothRadius(options),
  };
}
