import { describe, expect, it } from "vitest";
import { alphaToGreyPixels, applyAlpha, greyPixelsToAlpha, outputToAlpha, pixelsToTensor } from "./tensor";

describe("pixelsToTensor", () => {
  it("lays the channels out as planes normalised by the ImageNet statistics", () => {
    // A 2 by 2 picture: one white pixel, one black, one pure red, one mid grey.
    const pixels = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255, 128, 128, 128, 255]);
    const tensor = pixelsToTensor(pixels, 2);
    expect(tensor.length).toBe(12);
    // Red plane first: white and red are 1, black is 0, grey is 128/255.
    expect(tensor[0]).toBeCloseTo((1 - 0.485) / 0.229, 5);
    expect(tensor[1]).toBeCloseTo((0 - 0.485) / 0.229, 5);
    expect(tensor[2]).toBeCloseTo((1 - 0.485) / 0.229, 5);
    expect(tensor[3]).toBeCloseTo((128 / 255 - 0.485) / 0.229, 5);
    // Green plane: red pixel has no green.
    expect(tensor[4 + 2]).toBeCloseTo((0 - 0.456) / 0.224, 5);
    // Blue plane: white pixel.
    expect(tensor[8]).toBeCloseTo((1 - 0.406) / 0.225, 5);
  });

  it("scales by the brightest value so a dim picture is stretched", () => {
    const pixels = new Uint8ClampedArray([100, 50, 0, 255]);
    const tensor = pixelsToTensor(pixels, 1);
    expect(tensor[0]).toBeCloseTo((1 - 0.485) / 0.229, 5);
    expect(tensor[1]).toBeCloseTo((0.5 - 0.456) / 0.224, 5);
  });

  it("refuses pixels of the wrong size", () => {
    expect(() => pixelsToTensor(new Uint8ClampedArray(8), 2)).toThrow(/Expected 16 bytes/);
  });
});

describe("outputToAlpha", () => {
  it("stretches the output so the lowest value is clear and the highest opaque", () => {
    const alpha = outputToAlpha([-1, 0, 1, -0.5], 2);
    expect(Array.from(alpha)).toEqual([0, 128, 255, 64]);
  });

  it("keeps everything opaque when the output is flat", () => {
    expect(Array.from(outputToAlpha([0.5, 0.5, 0.5, 0.5], 2))).toEqual([255, 255, 255, 255]);
  });

  it("only reads the first plane of a larger output", () => {
    const alpha = outputToAlpha([0, 1, 0.5, 0.5, 9, 9, 9, 9], 2);
    expect(Array.from(alpha)).toEqual([0, 255, 128, 128]);
  });

  it("refuses an output that is too small", () => {
    expect(() => outputToAlpha([1, 2], 2)).toThrow(/at least 4/);
  });
});

describe("applyAlpha", () => {
  it("writes the plane into the alpha channel and keeps existing holes", () => {
    const pixels = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 40]);
    applyAlpha(pixels, new Uint8ClampedArray([100, 200]));
    expect(Array.from(pixels)).toEqual([1, 2, 3, 100, 4, 5, 6, 40]);
  });

  it("refuses mismatched sizes", () => {
    expect(() => applyAlpha(new Uint8ClampedArray(8), new Uint8ClampedArray(3))).toThrow(/does not match/);
  });
});

describe("grey mask round trip", () => {
  it("expands to opaque grey pixels and reads back the same values", () => {
    const alpha = new Uint8ClampedArray([0, 77, 255]);
    const grey = alphaToGreyPixels(alpha);
    expect(Array.from(grey)).toEqual([0, 0, 0, 255, 77, 77, 77, 255, 255, 255, 255, 255]);
    expect(Array.from(greyPixelsToAlpha(grey))).toEqual([0, 77, 255]);
  });
});
