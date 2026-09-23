import { describe, expect, it } from "vitest";
import { hexToRgb, tintPixels } from "./image-tint";

describe("image tint", () => {
  it("reads hex colours", () => {
    expect(hexToRgb("#ff8000")).toEqual([255, 128, 0]);
    expect(hexToRgb("#FA0")).toEqual([255, 170, 0]);
    expect(hexToRgb("transparent")).toBeNull();
  });

  it("paints one colour and keeps transparency", () => {
    const data = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 0]);
    tintPixels(data, [10, 20, 30]);
    expect(Array.from(data)).toEqual([10, 20, 30, 255, 10, 20, 30, 0]);
  });
});
