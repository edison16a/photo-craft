import { describe, expect, it } from "vitest";
import { simplifyPoints } from "./simplify";

describe("simplifyPoints", () => {
  it("drops points that sit on a straight line", () => {
    expect(simplifyPoints([0, 0, 5, 0.1, 10, 0, 15, -0.1, 20, 0], 1)).toEqual([0, 0, 20, 0]);
  });

  it("keeps corners that stick out", () => {
    expect(simplifyPoints([0, 0, 10, 0, 10, 10, 20, 10], 1)).toEqual([0, 0, 10, 0, 10, 10, 20, 10]);
    expect(simplifyPoints([0, 0, 10, 8, 20, 0], 1)).toEqual([0, 0, 10, 8, 20, 0]);
  });

  it("leaves two points or fewer alone and ignores a trailing odd value", () => {
    expect(simplifyPoints([1, 2, 3, 4], 5)).toEqual([1, 2, 3, 4]);
    expect(simplifyPoints([1, 2, 3], 5)).toEqual([1, 2]);
    expect(simplifyPoints([], 5)).toEqual([]);
  });
});
