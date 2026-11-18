/**
 * The chroma key maths on hand made pixels: what goes, what stays and
 * what fades.
 */
import { describe, expect, it } from "vitest";
import type { ChromaKey } from "../model/types";
import { chromaKeyPixels, DEFAULT_SOFTNESS, DEFAULT_TOLERANCE, keepFactor, keyDistance, keyId, keyRange, pickedKey } from "./chroma-key";

const GREEN: ChromaKey = { color: "#00b140", tolerance: DEFAULT_TOLERANCE, softness: DEFAULT_SOFTNESS };

/** RGBA pixels from a list of [r, g, b, a] tuples. */
function pixels(...list: number[][]): Uint8ClampedArray {
  return new Uint8ClampedArray(list.flat());
}

/** Alpha of each pixel after keying. */
function keyedAlphas(key: ChromaKey, ...list: number[][]): number[] {
  const data = pixels(...list);
  chromaKeyPixels(data, key);
  return list.map((_, index) => data[index * 4 + 3]);
}

describe("chroma key", () => {
  it("removes the exact colour and leaves its rgb alone", () => {
    const data = pixels([0, 177, 64, 255]);
    chromaKeyPixels(data, GREEN);
    expect([...data]).toEqual([0, 177, 64, 0]);
  });

  it("keeps colours far from the key", () => {
    expect(keyedAlphas(GREEN, [220, 30, 30, 255], [220, 170, 140, 255], [20, 20, 20, 255], [250, 250, 250, 255])).toEqual([255, 255, 255, 255]);
  });

  it("removes lighter and darker shades of the key at the default tolerance", () => {
    expect(keyedAlphas(GREEN, [8, 160, 58, 255], [25, 195, 75, 255])).toEqual([0, 0]);
  });

  it("fades pixels across the softness", () => {
    const { inner, outer } = keyRange(GREEN);
    expect(keepFactor(inner, GREEN)).toBe(0);
    expect(keepFactor((inner + outer) / 2, GREEN)).toBeCloseTo(0.5);
    expect(keepFactor(outer, GREEN)).toBe(1);
    // Push red into the green until the distance lands inside the band.
    const key = { ...GREEN, tolerance: 10, softness: 40 };
    const range = keyRange(key);
    const red = [...Array(256).keys()].find((r) => {
      const distance = keyDistance([r, 177, 64], [0, 177, 64]);
      return distance > range.inner + 5 && distance < range.outer - 5;
    });
    expect(red).toBeDefined();
    const [alpha] = keyedAlphas(key, [red as number, 177, 64, 255]);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(255);
  });

  it("removes only near exact matches at tolerance 0", () => {
    const strict = { ...GREEN, tolerance: 0, softness: 0 };
    expect(keyedAlphas(strict, [0, 177, 64, 255], [1, 177, 64, 255], [0, 187, 64, 255], [12, 177, 64, 255])).toEqual([0, 0, 255, 255]);
  });

  it("never raises existing transparency", () => {
    const key = { ...GREEN, tolerance: 10, softness: 30 };
    const [far, half, clear] = keyedAlphas(key, [220, 30, 30, 128], [40, 177, 64, 128], [0, 177, 64, 0]);
    expect(far).toBe(128);
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(128);
    expect(clear).toBe(0);
  });

  it("does nothing for a colour it cannot read", () => {
    expect(keyedAlphas({ ...GREEN, color: "green" }, [0, 177, 64, 255])).toEqual([255]);
  });

  it("starts new keys at the defaults and keeps earlier settings", () => {
    expect(pickedKey("#123456")).toEqual({ color: "#123456", tolerance: DEFAULT_TOLERANCE, softness: DEFAULT_SOFTNESS });
    expect(pickedKey("#abcdef", { color: "#000000", tolerance: 60, softness: 5 })).toEqual({ color: "#abcdef", tolerance: 60, softness: 5 });
  });

  it("names keys by every setting", () => {
    expect(keyId(GREEN)).not.toBe(keyId({ ...GREEN, tolerance: 26 }));
    expect(keyId(GREEN)).not.toBe(keyId({ ...GREEN, softness: 11 }));
    expect(keyId(GREEN)).toBe(keyId({ ...GREEN, color: "#00B140" }));
  });
});
