import { describe, expect, it } from "vitest";
import { cornersNeeded, dedupePoints, shapeFromPoints, snapToGrid } from "./drawing";

describe("snapToGrid", () => {
  it("moves a point to the nearest crossing", () => {
    expect(snapToGrid({ x: 33, y: 47 }, 20)).toEqual({ x: 40, y: 40 });
    expect(snapToGrid({ x: 9, y: 11 }, 20)).toEqual({ x: 0, y: 20 });
  });

  it("leaves the point alone without a grid", () => {
    expect(snapToGrid({ x: 33, y: 47 }, 0)).toEqual({ x: 33, y: 47 });
  });
});

describe("dedupePoints", () => {
  it("drops a corner repeated by a double click", () => {
    expect(dedupePoints([0, 0, 10, 0, 10, 0.2, 10, 10])).toEqual([0, 0, 10, 0, 10, 10]);
  });
});

describe("shapeFromPoints", () => {
  it("boxes the corners and stores them as fractions", () => {
    const shape = shapeFromPoints([100, 50, 300, 50, 200, 250], { closed: true, grid: 20 });
    expect(shape).toEqual({ x: 100, y: 50, width: 200, height: 200, points: [0, 0, 1, 0, 0.5, 1], closed: true });
  });

  it("needs three corners closed and two open", () => {
    expect(cornersNeeded({ closed: true, grid: 20 })).toBe(3);
    expect(cornersNeeded({ closed: false, grid: 20 })).toBe(2);
    expect(shapeFromPoints([0, 0, 10, 10], { closed: true, grid: 20 })).toBeNull();
    expect(shapeFromPoints([0, 0, 10, 10], { closed: false, grid: 20 })).toMatchObject({ closed: false });
  });

  it("gives a flat stroke a height of one so it still exists", () => {
    expect(shapeFromPoints([0, 5, 40, 5], { closed: false, grid: 20 })).toMatchObject({ width: 40, height: 1, points: [0, 0, 1, 0] });
  });
});
