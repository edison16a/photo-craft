import { describe, expect, it } from "vitest";
import { adjustPixels, DEFAULT_ADJUST, hexToRgb, isDefaultAdjust, tintPixels } from "./image-adjust";

const pixels = (...values: number[]) => new Uint8ClampedArray(values);

describe("image adjust", () => {
  it("knows when nothing would change", () => {
    expect(isDefaultAdjust(undefined)).toBe(true);
    expect(isDefaultAdjust({ ...DEFAULT_ADJUST })).toBe(true);
    expect(isDefaultAdjust({ ...DEFAULT_ADJUST, hue: 10 })).toBe(false);
  });

  it("reads hex colours", () => {
    expect(hexToRgb("#ff8000")).toEqual([255, 128, 0]);
    expect(hexToRgb("#FA0")).toEqual([255, 170, 0]);
    expect(hexToRgb("transparent")).toBeNull();
  });

  it("leaves pixels alone at the defaults", () => {
    const data = pixels(10, 200, 30, 255, 0, 0, 0, 0);
    adjustPixels(data, DEFAULT_ADJUST);
    expect(Array.from(data)).toEqual([10, 200, 30, 255, 0, 0, 0, 0]);
  });

  it("turns the picture grey at zero saturation and keeps alpha", () => {
    const data = pixels(255, 0, 0, 128);
    adjustPixels(data, { ...DEFAULT_ADJUST, saturation: 0 });
    expect(data[0]).toBe(data[1]);
    expect(data[1]).toBe(data[2]);
    expect(data[0]).toBe(54);
    expect(data[3]).toBe(128);
  });

  it("brightens, darkens and flattens", () => {
    const light = pixels(100, 100, 100, 255);
    adjustPixels(light, { ...DEFAULT_ADJUST, brightness: 100 });
    expect(Array.from(light.slice(0, 3))).toEqual([255, 255, 255]);
    const dark = pixels(100, 100, 100, 255);
    adjustPixels(dark, { ...DEFAULT_ADJUST, brightness: -100 });
    expect(Array.from(dark.slice(0, 3))).toEqual([0, 0, 0]);
    const flat = pixels(10, 250, 90, 255);
    adjustPixels(flat, { ...DEFAULT_ADJUST, contrast: -100 });
    expect(Array.from(flat.slice(0, 3))).toEqual([128, 128, 128]);
  });

  it("turns red towards cyan half way round the wheel", () => {
    const data = pixels(255, 0, 0, 255);
    adjustPixels(data, { ...DEFAULT_ADJUST, hue: 180 });
    expect(data[0]).toBeLessThan(data[1]);
    expect(data[0]).toBeLessThan(data[2]);
  });

  it("paints one colour and keeps transparency", () => {
    const data = pixels(1, 2, 3, 255, 4, 5, 6, 0);
    tintPixels(data, [10, 20, 30]);
    expect(Array.from(data)).toEqual([10, 20, 30, 255, 10, 20, 30, 0]);
  });
});
