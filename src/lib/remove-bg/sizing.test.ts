import { describe, expect, it } from "vitest";
import { MAX_OUTPUT_SIDE, scaleOf, sizeFromHeight, sizeFromScale, sizeFromWidth } from "./sizing";

const original = { width: 800, height: 600 };

describe("cutout sizing", () => {
  it("keeps the proportions from a width or a height", () => {
    expect(sizeFromWidth(original, 400)).toEqual({ width: 400, height: 300 });
    expect(sizeFromHeight(original, 150)).toEqual({ width: 200, height: 150 });
  });

  it("scales by a factor", () => {
    expect(sizeFromScale(original, 2)).toEqual({ width: 1600, height: 1200 });
    expect(sizeFromScale(original, 0.5)).toEqual({ width: 400, height: 300 });
    expect(scaleOf(original, { width: 1600, height: 1200 })).toBe(2);
  });

  it("rounds to whole pixels and never goes below one", () => {
    expect(sizeFromWidth({ width: 3, height: 1 }, 1)).toEqual({ width: 1, height: 1 });
    expect(sizeFromWidth(original, 333)).toEqual({ width: 333, height: 250 });
    expect(sizeFromWidth(original, 0)).toEqual({ width: 1, height: 1 });
  });

  it("caps very large sizes", () => {
    expect(sizeFromWidth(original, 100000).width).toBe(MAX_OUTPUT_SIDE);
    expect(sizeFromScale({ width: 100, height: 20000 }, 1).height).toBe(MAX_OUTPUT_SIDE);
  });
});
