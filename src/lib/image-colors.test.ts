import { describe, expect, it } from "vitest";
import { isValidHex } from "../data/colors";
import { MAX_IMAGE_COLORS, quantizeColors } from "./image-colors";

/** One RGBA pixel as four bytes. Alpha defaults to fully opaque. */
function pixel(red: number, green: number, blue: number, alpha = 255): number[] {
  return [red, green, blue, alpha];
}

/** Repeats a pixel count times and joins the result into RGBA data. */
function fill(count: number, rgba: number[]): number[] {
  const out: number[] = [];
  for (let index = 0; index < count; index += 1) out.push(...rgba);
  return out;
}

/** Builds the typed array quantizeColors expects from plain number lists. */
function rgba(...parts: number[][]): Uint8ClampedArray {
  return new Uint8ClampedArray(parts.flat());
}

describe("quantizeColors", () => {
  it("returns the biggest colour first and skips transparent pixels", () => {
    // A 4 by 4 picture: 10 red, 4 blue and 2 see through pixels.
    const pixels = rgba(
      fill(10, pixel(255, 0, 0)),
      fill(4, pixel(0, 0, 255)),
      fill(2, pixel(0, 255, 0, 0)),
    );
    expect(pixels.length).toBe(4 * 4 * 4);
    const result = quantizeColors(pixels);
    expect(result).toEqual([
      { hex: "#ff0000", count: 10 },
      { hex: "#0000ff", count: 4 },
    ]);
  });

  it("collapses two near identical reds into one colour", () => {
    // These two reds land in the same coarse bucket.
    const sameBucket = rgba(fill(6, pixel(255, 0, 0)), fill(6, pixel(250, 4, 2)));
    expect(quantizeColors(sameBucket)).toHaveLength(1);
    // These two sit in neighbouring buckets but are still closer than the
    // minimum distance, so the second one is dropped as a near duplicate.
    const nearBucket = rgba(fill(6, pixel(255, 0, 0)), fill(5, pixel(235, 0, 0)));
    const result = quantizeColors(nearBucket);
    expect(result).toHaveLength(1);
    expect(result[0].hex).toBe("#ff0000");
    // With no minimum distance both reds come back.
    expect(quantizeColors(nearBucket, MAX_IMAGE_COLORS, 0)).toHaveLength(2);
  });

  it("averages the pixels that share a bucket", () => {
    const pixels = rgba(fill(1, pixel(240, 0, 0)), fill(1, pixel(255, 0, 0)));
    expect(quantizeColors(pixels)).toEqual([{ hex: "#f80000", count: 2 }]);
  });

  it("drops a single stray pixel in a 1000 pixel picture", () => {
    const pixels = rgba(fill(999, pixel(255, 255, 255)), fill(1, pixel(0, 0, 0)));
    expect(quantizeColors(pixels)).toEqual([{ hex: "#ffffff", count: 999 }]);
  });

  it("caps the result at maxColors", () => {
    const pixels = rgba(
      fill(9, pixel(255, 0, 0)),
      fill(8, pixel(0, 255, 0)),
      fill(7, pixel(0, 0, 255)),
      fill(6, pixel(255, 255, 0)),
      fill(5, pixel(0, 255, 255)),
      fill(4, pixel(255, 0, 255)),
      fill(3, pixel(0, 0, 0)),
      fill(2, pixel(255, 255, 255)),
    );
    expect(quantizeColors(pixels)).toHaveLength(MAX_IMAGE_COLORS);
    const three = quantizeColors(pixels, 3);
    expect(three.map((color) => color.hex)).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
    expect(quantizeColors(pixels, 0)).toEqual([]);
  });

  it("returns valid lowercase hex strings", () => {
    const pixels = rgba(
      fill(4, pixel(0xab, 0xcd, 0xef)),
      fill(3, pixel(0x0a, 0x0b, 0x0c)),
      fill(2, pixel(0xfa, 0xce, 0x1d)),
    );
    const result = quantizeColors(pixels);
    expect(result).toHaveLength(3);
    for (const { hex } of result) {
      expect(isValidHex(hex)).toBe(true);
      expect(hex).toBe(hex.toLowerCase());
      expect(hex).toHaveLength(7);
    }
    expect(result[0].hex).toBe("#abcdef");
  });

  it("gives nothing for empty or fully transparent input", () => {
    expect(quantizeColors(new Uint8ClampedArray(0))).toEqual([]);
    expect(quantizeColors(rgba(fill(5, pixel(255, 0, 0, 10))))).toEqual([]);
  });
});
