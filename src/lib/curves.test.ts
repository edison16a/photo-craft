import { describe, expect, it } from "vitest";
import { smoothPath } from "./curves";

describe("smoothPath", () => {
  it("draws straight sides with no tension", () => {
    expect(smoothPath([0, 0, 10, 0, 10, 10], true, 0)).toBe("M 0 0 L 10 0 L 10 10 Z");
    expect(smoothPath([0, 0, 10, 0], false, 0.5)).toBe("M 0 0 L 10 0");
  });

  it("curves through every corner and passes through the points", () => {
    const path = smoothPath([0, 0, 10, 0, 10, 10, 0, 10], true, 0.5);
    expect(path.startsWith("M 0 0 C ")).toBe(true);
    expect(path.endsWith(" Z")).toBe(true);
    // Four segments for a closed square, each ending on the next corner.
    expect((path.match(/ C /g) ?? []).length).toBe(4);
    expect(path).toContain(" 10 0 C");
    expect(path).toContain(" 0 0 Z");
  });

  it("keeps the ends of an open path where they are", () => {
    const path = smoothPath([0, 0, 10, 0, 20, 10], false, 0.5);
    expect(path.startsWith("M 0 0 C 0 0 ")).toBe(true);
    expect(path.endsWith(" 20 10 20 10")).toBe(true);
  });

  it("gives nothing for fewer than two points", () => {
    expect(smoothPath([5, 5], true, 0.5)).toBe("");
  });
});
