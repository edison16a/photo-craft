import { describe, it, expect } from "vitest";
import type { ShapeKind } from "../model/types";
import {
  SHAPE_CATALOG,
  linePoints,
  pointsToSvgPath,
  polygonPoints,
} from "./shapes";

const POLYGON_KINDS: ShapeKind[] = [
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "star",
];

const NON_POLYGON_KINDS: ShapeKind[] = ["rectangle", "ellipse", "line", "arrow"];

/** Splits a flat list into [x, y] pairs so assertions read naturally. */
function toPairs(points: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let index = 0; index < points.length; index += 2) {
    pairs.push([points[index], points[index + 1]]);
  }
  return pairs;
}

function expectWithinBox(points: number[], width: number, height: number) {
  for (const [x, y] of toPairs(points)) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(width);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(height);
  }
}

function expectTouchesEverySide(points: number[], width: number, height: number) {
  const pairs = toPairs(points);
  expect(Math.min(...pairs.map(([x]) => x))).toBe(0);
  expect(Math.max(...pairs.map(([x]) => x))).toBe(width);
  expect(Math.min(...pairs.map(([, y]) => y))).toBe(0);
  expect(Math.max(...pairs.map(([, y]) => y))).toBe(height);
}

describe("SHAPE_CATALOG", () => {
  it("lists all nine shape kinds in picker order", () => {
    expect(SHAPE_CATALOG.map((option) => option.kind)).toEqual([
      "rectangle",
      "ellipse",
      "triangle",
      "diamond",
      "pentagon",
      "hexagon",
      "star",
      "line",
      "arrow",
    ]);
  });

  it("has unique kinds and a label for each", () => {
    const kinds = SHAPE_CATALOG.map((option) => option.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const option of SHAPE_CATALOG) {
      expect(option.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("polygonPoints", () => {
  it("returns null for shapes that are not polygons", () => {
    for (const kind of NON_POLYGON_KINDS) {
      expect(polygonPoints(kind, 100, 100)).toBeNull();
    }
  });

  it("builds a triangle with its apex at the top centre", () => {
    expect(polygonPoints("triangle", 100, 80)).toEqual([50, 0, 100, 80, 0, 80]);
  });

  it("builds a diamond from the four edge midpoints", () => {
    expect(polygonPoints("diamond", 100, 80)).toEqual([
      50, 0, 100, 40, 50, 80, 0, 40,
    ]);
  });

  it("returns the expected number of values per kind", () => {
    expect(polygonPoints("triangle", 100, 100)).toHaveLength(6);
    expect(polygonPoints("diamond", 100, 100)).toHaveLength(8);
    expect(polygonPoints("pentagon", 100, 100)).toHaveLength(10);
    expect(polygonPoints("hexagon", 100, 100)).toHaveLength(12);
    expect(polygonPoints("star", 100, 100)).toHaveLength(20);
  });

  it("keeps every point inside the box for several box sizes", () => {
    const sizes: [number, number][] = [
      [100, 100],
      [300, 120],
      [37, 411],
      [1, 1],
      [0, 50],
    ];
    for (const kind of POLYGON_KINDS) {
      for (const [width, height] of sizes) {
        const points = polygonPoints(kind, width, height);
        expect(points).not.toBeNull();
        expectWithinBox(points ?? [], width, height);
      }
    }
  });

  it("stretches the generated polygons so they touch all four sides", () => {
    for (const kind of ["pentagon", "hexagon", "star"] as ShapeKind[]) {
      expectTouchesEverySide(polygonPoints(kind, 200, 120) ?? [], 200, 120);
    }
  });

  it("mirrors the generated polygons when a side is negative", () => {
    for (const kind of ["pentagon", "hexagon", "star"] as ShapeKind[]) {
      const upright = toPairs(polygonPoints(kind, 100, 80) ?? []);
      const mirrored = toPairs(polygonPoints(kind, -100, 80) ?? []);
      expect(mirrored).toHaveLength(upright.length);
      for (const [index, [x, y]] of mirrored.entries()) {
        expect(x).toBeGreaterThanOrEqual(-100);
        expect(x).toBeLessThanOrEqual(0);
        expect(x).toBeCloseTo(-upright[index][0], 3);
        expect(y).toBeCloseTo(upright[index][1], 3);
      }
    }
  });

  it("puts the pentagon apex at the top centre", () => {
    const [first] = toPairs(polygonPoints("pentagon", 200, 100) ?? []);
    expect(first).toEqual([100, 0]);
  });

  it("gives the hexagon a flat top and a flat bottom", () => {
    const pairs = toPairs(polygonPoints("hexagon", 200, 100) ?? []);
    const topPoints = pairs.filter(([, y]) => y === 0);
    const bottomPoints = pairs.filter(([, y]) => y === 100);
    expect(topPoints).toHaveLength(2);
    expect(bottomPoints).toHaveLength(2);
    expect(pairs).toContainEqual([0, 50]);
    expect(pairs).toContainEqual([200, 50]);
  });

  it("alternates outer tips and inner corners on the star", () => {
    const width = 100;
    const height = 100;
    const pairs = toPairs(polygonPoints("star", width, height) ?? []);
    expect(pairs[0]).toEqual([50, 0]);
    const distances = pairs.map(([x, y]) =>
      Math.hypot(x - width / 2, y - height / 2),
    );
    const outer = distances.filter((_, index) => index % 2 === 0);
    const inner = distances.filter((_, index) => index % 2 === 1);
    expect(Math.min(...outer)).toBeGreaterThan(Math.max(...inner));
    expect(Math.max(...inner) / Math.max(...outer)).toBeLessThan(0.55);
  });
});

describe("linePoints", () => {
  it("draws a horizontal line through the vertical centre", () => {
    expect(linePoints(120, 40)).toEqual([0, 20, 120, 20]);
  });
});

describe("pointsToSvgPath", () => {
  it("formats a closed path with move, line and close commands", () => {
    expect(pointsToSvgPath([0, 0, 10, 0, 10, 10])).toBe("M 0 0 L 10 0 L 10 10 Z");
  });

  it("returns an empty string for an empty list", () => {
    expect(pointsToSvgPath([])).toBe("");
  });

  it("ignores a trailing number without a partner", () => {
    expect(pointsToSvgPath([5, 6, 7])).toBe("M 5 6 Z");
  });

  it("matches the polygon output for a triangle", () => {
    const points = polygonPoints("triangle", 100, 80) ?? [];
    expect(pointsToSvgPath(points)).toBe("M 50 0 L 100 80 L 0 80 Z");
  });
});
