import { describe, expect, it } from "vitest";
import { cornersNeeded, dedupePoints, dropCollinear, extendsStraightRun, shapeFromPoints, smoothRadius, snapToGrid } from "./drawing";

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
    const shape = shapeFromPoints([100, 50, 300, 50, 200, 250], { closed: true, grid: 20, smooth: false });
    expect(shape).toEqual({ x: 100, y: 50, width: 200, height: 200, points: [0, 0, 1, 0, 0.5, 1], closed: true, cornerRadius: 0 });
  });

  it("needs three corners closed and two open", () => {
    expect(cornersNeeded({ closed: true, grid: 20, smooth: false })).toBe(3);
    expect(cornersNeeded({ closed: false, grid: 20, smooth: false })).toBe(2);
    expect(shapeFromPoints([0, 0, 10, 10], { closed: true, grid: 20, smooth: false })).toBeNull();
    expect(shapeFromPoints([0, 0, 10, 10], { closed: false, grid: 20, smooth: false })).toMatchObject({ closed: false });
  });

  it("gives a flat stroke a height of one so it still exists", () => {
    expect(shapeFromPoints([0, 5, 40, 5], { closed: false, grid: 20, smooth: false })).toMatchObject({ width: 40, height: 1, points: [0, 0, 1, 0] });
  });
});

describe("dropCollinear", () => {
  it("drops corners on straight runs, wrapping around a closed outline", () => {
    expect(dropCollinear([0, 0, 10, 0, 20, 0, 20, 20], false)).toEqual([0, 0, 20, 0, 20, 20]);
    expect(dropCollinear([10, 0, 20, 0, 20, 20, 0, 20, 0, 0], true)).toEqual([20, 0, 20, 20, 0, 20, 0, 0]);
  });

  it("keeps a corner where the run turns back on itself", () => {
    expect(dropCollinear([0, 0, 20, 0, 10, 0], false)).toEqual([0, 0, 20, 0, 10, 0]);
  });
});

describe("smoothRadius", () => {
  it("rounds by one grid step when smoothing is on", () => {
    expect(smoothRadius({ closed: true, grid: 40, smooth: true })).toBe(40);
    expect(smoothRadius({ closed: true, grid: 40, smooth: false })).toBe(0);
    expect(shapeFromPoints([0, 0, 40, 0, 40, 40, 0, 40], { closed: true, grid: 40, smooth: true })?.cornerRadius).toBe(40);
  });
});

describe("extendsStraightRun", () => {
  it("is true only when the new corner carries straight on", () => {
    expect(extendsStraightRun([0, 0, 20, 0], { x: 40, y: 0 })).toBe(true);
    expect(extendsStraightRun([0, 0, 20, 0], { x: 40, y: 20 })).toBe(false);
    expect(extendsStraightRun([0, 0, 20, 0], { x: 0, y: 0 })).toBe(false);
    expect(extendsStraightRun([0, 0], { x: 20, y: 0 })).toBe(false);
  });
});
