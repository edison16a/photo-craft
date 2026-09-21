/**
 * Shape catalog and polygon geometry.
 *
 * Both the Konva renderer and the SVG preview draw shapes from the same
 * point lists, so this module is the one place that decides what a
 * "pentagon" or a "star" looks like. Every point list is expressed in the
 * element's own box, with (0, 0) at the top left corner and (width, height)
 * at the bottom right. Rotation and flipping are applied by the caller.
 */

import type { ShapeKind } from "../model/types";

/** One entry in the shape picker. */
export interface ShapeOption {
  kind: ShapeKind;
  /** Human readable name shown in the toolbar. */
  label: string;
}

/**
 * Every shape the editor can insert, in the order the picker shows them.
 * Rectangles, ellipses, lines and arrows are drawn with dedicated Konva
 * nodes. The rest are polygons built by polygonPoints.
 */
export const SHAPE_CATALOG: ShapeOption[] = [
  { kind: "rectangle", label: "Rectangle" },
  { kind: "ellipse", label: "Ellipse" },
  { kind: "triangle", label: "Triangle" },
  { kind: "diamond", label: "Diamond" },
  { kind: "pentagon", label: "Pentagon" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "star", label: "Star" },
  { kind: "line", label: "Line" },
  { kind: "arrow", label: "Arrow" },
];

/** Inner radius of the star as a fraction of the outer radius. */
const STAR_INNER_RATIO = 0.4;

/** Number of decimals kept in generated coordinates. */
const COORDINATE_DECIMALS = 4;

interface UnitPoint {
  x: number;
  y: number;
}

/** Rounds to a fixed number of decimals so path strings stay readable. */
function round(value: number): number {
  const factor = 10 ** COORDINATE_DECIMALS;
  return Math.round(value * factor) / factor;
}

/**
 * Points of a regular polygon on the unit circle, walking clockwise on
 * screen (positive y goes down). startDeg is the angle of the first vertex,
 * with -90 meaning straight up.
 */
function regularUnitPolygon(sides: number, startDeg: number): UnitPoint[] {
  const points: UnitPoint[] = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = ((startDeg + (360 / sides) * index) * Math.PI) / 180;
    points.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }
  return points;
}

/**
 * Points of a star with the given number of tips. Outer and inner vertices
 * alternate, starting with the outer tip that points straight up.
 */
function starUnitPolygon(tips: number, innerRatio: number): UnitPoint[] {
  const points: UnitPoint[] = [];
  const step = 360 / (tips * 2);
  for (let index = 0; index < tips * 2; index += 1) {
    const angle = ((-90 + step * index) * Math.PI) / 180;
    const radius = index % 2 === 0 ? 1 : innerRatio;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

/** Keeps a coordinate inside [0, size], or [size, 0] when size is negative. */
function clampToSide(value: number, size: number): number {
  return Math.min(Math.max(0, size), Math.max(Math.min(0, size), value));
}

/**
 * Stretches unit points so the polygon exactly fills a width by height box.
 * The x and y axes are scaled independently, which is what we want: a wide
 * box gives a wide pentagon and the selection handles hug the visible shape.
 * Output is the flat [x0, y0, x1, y1, ...] form Konva and SVG both use.
 */
function fitToBox(points: UnitPoint[], width: number, height: number): number[] {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const flat: number[] = [];
  for (const point of points) {
    const x = ((point.x - minX) / spanX) * width;
    const y = ((point.y - minY) / spanY) * height;
    flat.push(
      clampToSide(round(x), width),
      clampToSide(round(y), height),
    );
  }
  return flat;
}

/**
 * Vertex list for the polygon shapes, as flat [x0, y0, x1, y1, ...] numbers
 * that fill the given box. Triangles have their apex at the top centre,
 * hexagons have a flat top and bottom, stars have five tips with an inner
 * radius of 40 percent. Returns null for rectangle, ellipse, line and
 * arrow because those are not drawn as polygons.
 */
export function polygonPoints(
  kind: ShapeKind,
  width: number,
  height: number,
): number[] | null {
  switch (kind) {
    case "triangle":
      return [width / 2, 0, width, height, 0, height];
    case "diamond":
      return [width / 2, 0, width, height / 2, width / 2, height, 0, height / 2];
    case "pentagon":
      return fitToBox(regularUnitPolygon(5, -90), width, height);
    case "hexagon":
      return fitToBox(regularUnitPolygon(6, 0), width, height);
    case "star":
      return fitToBox(starUnitPolygon(5, STAR_INNER_RATIO), width, height);
    default:
      return null;
  }
}

/**
 * End points of a line element: a horizontal stroke through the vertical
 * centre of the box, from the left edge to the right edge. Arrows use the
 * same points and add a head at the second point.
 */
export function linePoints(width: number, height: number): number[] {
  return [0, height / 2, width, height / 2];
}

/**
 * Turns a flat point list into a closed SVG path, for example
 * "M 0 0 L 10 0 L 10 10 Z". An empty list gives an empty string. A trailing
 * number without a partner is ignored.
 */
export function pointsToSvgPath(points: number[]): string {
  const pairCount = Math.floor(points.length / 2);
  if (pairCount === 0) {
    return "";
  }
  const commands: string[] = [];
  for (let index = 0; index < pairCount; index += 1) {
    const command = index === 0 ? "M" : "L";
    commands.push(`${command} ${points[index * 2]} ${points[index * 2 + 1]}`);
  }
  commands.push("Z");
  return commands.join(" ");
}
