import { describe, expect, it } from "vitest";
import { cornersNeeded, dedupePoints, shapeFromPoints } from "./drawing";

describe("dedupePoints", () => {
  it("drops a corner repeated by a double click", () => {
    expect(dedupePoints([0, 0, 10, 0, 10, 0.2, 10, 10])).toEqual([0, 0, 10, 0, 10, 10]);
  });
});

describe("shapeFromPoints", () => {
  it("boxes the corners and stores them as fractions", () => {
    const shape = shapeFromPoints([100, 50, 300, 50, 200, 250], { curved: false, closed: true });
    expect(shape).toEqual({ x: 100, y: 50, width: 200, height: 200, points: [0, 0, 1, 0, 0.5, 1], closed: true, tension: 0 });
  });

  it("needs three corners closed and two open", () => {
    expect(cornersNeeded({ curved: true, closed: true })).toBe(3);
    expect(cornersNeeded({ curved: true, closed: false })).toBe(2);
    expect(shapeFromPoints([0, 0, 10, 10], { curved: true, closed: true })).toBeNull();
    expect(shapeFromPoints([0, 0, 10, 10], { curved: true, closed: false })).toMatchObject({ closed: false, tension: 0.5 });
  });

  it("gives a flat stroke a height of one so it still exists", () => {
    expect(shapeFromPoints([0, 5, 40, 5], { curved: false, closed: false })).toMatchObject({ width: 40, height: 1, points: [0, 0, 1, 0] });
  });
});
