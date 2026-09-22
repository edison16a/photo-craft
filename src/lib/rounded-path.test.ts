import { describe, expect, it } from "vitest";
import { roundedPolygonPath } from "./rounded-path";

const SQUARE = [0, 0, 10, 0, 10, 10, 0, 10];

describe("roundedPolygonPath", () => {
  it("draws straight sides with no radius", () => {
    expect(roundedPolygonPath(SQUARE, 0, true)).toBe("M 0 0 L 10 0 L 10 10 L 0 10 Z");
    expect(roundedPolygonPath([0, 0, 10, 0, 10, 10], 0, false)).toBe("M 0 0 L 10 0 L 10 10");
  });

  it("rounds every corner of a closed square with true quarter circles", () => {
    expect(roundedPolygonPath(SQUARE, 2, true)).toBe(
      "M 0 2 A 2 2 0 0 1 2 0 L 8 0 A 2 2 0 0 1 10 2 L 10 8 A 2 2 0 0 1 8 10 L 2 10 A 2 2 0 0 1 0 8 Z",
    );
  });

  it("never cuts back more than halfway along a side", () => {
    expect(roundedPolygonPath(SQUARE, 50, true)).toBe(
      "M 0 5 A 5 5 0 0 1 5 0 L 5 0 A 5 5 0 0 1 10 5 L 10 5 A 5 5 0 0 1 5 10 L 5 10 A 5 5 0 0 1 0 5 Z",
    );
  });

  it("keeps the ends of an open path sharp and rounds the middle", () => {
    expect(roundedPolygonPath([0, 0, 10, 0, 10, 10], 2, false)).toBe("M 0 0 L 8 0 A 2 2 0 0 1 10 2 L 10 10");
  });

  it("turns the arcs the other way for a counter clockwise polygon", () => {
    const path = roundedPolygonPath([0, 0, 0, 10, 10, 10, 10, 0], 2, true);
    expect(path).toContain("A 2 2 0 0 0");
    expect(path).not.toContain("A 2 2 0 0 1");
  });

  it("skips corners on a straight run and gives nothing for a single point", () => {
    expect(roundedPolygonPath([0, 0, 5, 0, 10, 0], 2, false)).toBe("M 0 0 L 5 0 L 10 0");
    expect(roundedPolygonPath([3, 3], 2, true)).toBe("");
  });
});
