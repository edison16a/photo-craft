/**
 * Shape catalog and geometry.
 *
 * The Konva renderer, the export and the SVG preview all draw shapes from
 * the same definitions here, so this module is the one place that decides
 * what a "pentagon" or a "heart" looks like. Polygons are point lists in
 * the element's own box, with (0, 0) at the top left and (width, height) at
 * the bottom right. Curved shapes are SVG paths drawn in a 100 by 100 box
 * that the caller scales. Rotation and flipping are applied by the caller.
 */

import type { ShapeElement, ShapeKind } from "../model/types";

/** One entry in the shape picker. */
export interface ShapeOption {
  kind: ShapeKind;
  /** Human readable name shown in the toolbar. */
  label: string;
}

/**
 * Every shape the picker offers, in the order it shows them. Custom shapes
 * come from the draw tool and are not listed.
 */
export const SHAPE_CATALOG: ShapeOption[] = [
  { kind: "rectangle", label: "Rectangle" },
  { kind: "ellipse", label: "Ellipse" },
  { kind: "triangle", label: "Triangle" },
  { kind: "rightTriangle", label: "Right triangle" },
  { kind: "diamond", label: "Diamond" },
  { kind: "pentagon", label: "Pentagon" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "octagon", label: "Octagon" },
  { kind: "star", label: "Star" },
  { kind: "star4", label: "Sparkle" },
  { kind: "star6", label: "Star 6" },
  { kind: "star8", label: "Star 8" },
  { kind: "heart", label: "Heart" },
  { kind: "cloud", label: "Cloud" },
  { kind: "moon", label: "Moon" },
  { kind: "droplet", label: "Droplet" },
  { kind: "semicircle", label: "Semicircle" },
  { kind: "ring", label: "Ring" },
  { kind: "parallelogram", label: "Parallelogram" },
  { kind: "trapezoid", label: "Trapezoid" },
  { kind: "kite", label: "Kite" },
  { kind: "house", label: "House" },
  { kind: "chevron", label: "Chevron" },
  { kind: "blockArrow", label: "Block arrow" },
  { kind: "doubleArrow", label: "Double arrow" },
  { kind: "cross", label: "Cross" },
  { kind: "lightning", label: "Lightning" },
  { kind: "speechBubble", label: "Speech bubble" },
  { kind: "line", label: "Line" },
  { kind: "arrow", label: "Arrow" },
];

/** How each kind is drawn. */
export type ShapeGeometry = "rect" | "ellipse" | "line" | "arrow" | "polygon" | "path" | "custom";

/** Side of the box the path shapes are drawn in. */
export const PATH_BOX = 100;

/** Inner radius of the five point star as a fraction of the outer radius. */
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

/** Turns a flat list of unit box coordinates (0 to 1) into points. */
function unit(...values: number[]): UnitPoint[] {
  const points: UnitPoint[] = [];
  for (let index = 0; index + 1 < values.length; index += 2) points.push({ x: values[index], y: values[index + 1] });
  return points;
}

/**
 * Hand drawn polygons in a 0 to 1 box, walking clockwise. Each is
 * stretched to the element's box by fitToBox.
 */
const UNIT_POLYGONS: Partial<Record<ShapeKind, UnitPoint[]>> = {
  rightTriangle: unit(0, 0, 1, 1, 0, 1),
  parallelogram: unit(0.25, 0, 1, 0, 0.75, 1, 0, 1),
  trapezoid: unit(0.2, 0, 0.8, 0, 1, 1, 0, 1),
  kite: unit(0.5, 0, 1, 0.35, 0.5, 1, 0, 0.35),
  house: unit(0.5, 0, 1, 0.4, 1, 1, 0, 1, 0, 0.4),
  chevron: unit(0, 0, 0.7, 0, 1, 0.5, 0.7, 1, 0, 1, 0.3, 0.5),
  blockArrow: unit(0, 0.3, 0.6, 0.3, 0.6, 0, 1, 0.5, 0.6, 1, 0.6, 0.7, 0, 0.7),
  doubleArrow: unit(0, 0.5, 0.28, 0, 0.28, 0.3, 0.72, 0.3, 0.72, 0, 1, 0.5, 0.72, 1, 0.72, 0.7, 0.28, 0.7, 0.28, 1),
  cross: unit(0.33, 0, 0.67, 0, 0.67, 0.33, 1, 0.33, 1, 0.67, 0.67, 0.67, 0.67, 1, 0.33, 1, 0.33, 0.67, 0, 0.67, 0, 0.33, 0.33, 0.33),
  lightning: unit(0.45, 0, 0.9, 0, 0.6, 0.4, 0.85, 0.4, 0.2, 1, 0.4, 0.55, 0.1, 0.55),
};

/**
 * Curved shapes as SVG paths in a PATH_BOX square. A ring is two circles
 * drawn in opposite directions, so the inner one cuts a hole.
 */
const PATH_SHAPES: Partial<Record<ShapeKind, string>> = {
  heart: "M50 92 L14 54 C2 40 6 18 26 12 C36 9 46 14 50 22 C54 14 64 9 74 12 C94 18 98 40 86 54 Z",
  cloud: "M28 88 C12 88 4 76 8 64 C2 52 10 40 24 40 C26 24 42 14 56 20 C66 8 88 14 90 32 C100 36 100 54 90 60 C98 74 88 88 74 88 Z",
  moon: "M64 4 C34 4 12 26 12 52 C12 78 34 98 64 98 C74 98 84 94 90 88 C60 88 40 72 40 52 C40 32 60 16 90 14 C84 8 74 4 64 4 Z",
  semicircle: "M0 100 A50 50 0 0 1 100 100 Z",
  ring: "M50 0 A50 50 0 1 1 49.99 0 Z M50 22 A28 28 0 1 0 50.01 22 Z",
  droplet: "M50 0 C50 0 8 46 8 66 C8 86 26 100 50 100 C74 100 92 86 92 66 C92 46 50 0 50 0 Z",
  speechBubble: "M12 6 H88 C94 6 98 10 98 16 V60 C98 66 94 70 88 70 H44 L22 92 L26 70 H12 C6 70 2 66 2 60 V16 C2 10 6 6 12 6 Z",
};

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
    flat.push(clampToSide(round(x), width), clampToSide(round(y), height));
  }
  return flat;
}

/** How a kind is drawn, so renderers can pick the right node. */
export function shapeGeometry(kind: ShapeKind): ShapeGeometry {
  if (kind === "rectangle") return "rect";
  if (kind === "ellipse") return "ellipse";
  if (kind === "line") return "line";
  if (kind === "arrow") return "arrow";
  if (kind === "custom") return "custom";
  if (kind in PATH_SHAPES) return "path";
  return "polygon";
}

/**
 * Vertex list for the polygon shapes, as flat [x0, y0, x1, y1, ...] numbers
 * that fill the given box. Triangles have their apex at the top centre,
 * hexagons have a flat top and bottom, stars point straight up. Returns
 * null for kinds that are not drawn as polygons.
 */
export function polygonPoints(kind: ShapeKind, width: number, height: number): number[] | null {
  switch (kind) {
    case "triangle":
      return [width / 2, 0, width, height, 0, height];
    case "diamond":
      return [width / 2, 0, width, height / 2, width / 2, height, 0, height / 2];
    case "pentagon":
      return fitToBox(regularUnitPolygon(5, -90), width, height);
    case "hexagon":
      return fitToBox(regularUnitPolygon(6, 0), width, height);
    case "octagon":
      return fitToBox(regularUnitPolygon(8, -67.5), width, height);
    case "star":
      return fitToBox(starUnitPolygon(5, STAR_INNER_RATIO), width, height);
    case "star4":
      return fitToBox(starUnitPolygon(4, 0.3), width, height);
    case "star6":
      return fitToBox(starUnitPolygon(6, 0.55), width, height);
    case "star8":
      return fitToBox(starUnitPolygon(8, 0.6), width, height);
    default: {
      const points = UNIT_POLYGONS[kind];
      return points ? fitToBox(points, width, height) : null;
    }
  }
}

/** SVG path data of a curved shape in a PATH_BOX square, or null for other kinds. */
export function shapePathData(kind: ShapeKind): string | null {
  return PATH_SHAPES[kind] ?? null;
}

/**
 * Corners of a custom shape scaled from fractions to the element's box, as
 * flat [x0, y0, x1, y1, ...] numbers. An element without points gives an
 * empty list.
 */
export function customPoints(element: Pick<ShapeElement, "points">, width: number, height: number): number[] {
  const points = element.points ?? [];
  const flat: number[] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    flat.push(round(points[index] * width), round(points[index + 1] * height));
  }
  return flat;
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
