/**
 * jsdom has no canvas, so a small stand in fills every drawn picture with
 * one colour and keeps what is put back, enough to see which filters ran.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChromaKey } from "../../model/types";
import { filteredImage } from "./filtered-image";

const GREEN = [0, 177, 64, 255];
const KEY: ChromaKey = { color: "#00b140", tolerance: 25, softness: 10 };

/** What was put back into each canvas. */
const results = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>();

function fakeContext(canvas: HTMLCanvasElement) {
  return {
    drawImage: () => undefined,
    getImageData: (_x: number, _y: number, width: number, height: number) => {
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) data.set(GREEN, i);
      return { data, width, height };
    },
    putImageData: (pixels: { data: Uint8ClampedArray }) => results.set(canvas, pixels.data),
  };
}

/** A decoded picture of a given size. */
function picture(width: number, height: number): HTMLImageElement {
  const image = new Image();
  Object.defineProperty(image, "naturalWidth", { value: width });
  Object.defineProperty(image, "naturalHeight", { value: height });
  return image;
}

/** The first pixel of a filtered picture. */
function firstPixel(result: HTMLImageElement | HTMLCanvasElement): number[] {
  const data = results.get(result as HTMLCanvasElement);
  return data ? [...data.slice(0, 4)] : [];
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    return fakeContext(this) as unknown as CanvasRenderingContext2D;
  } as never);
});

afterEach(() => vi.restoreAllMocks());

describe("filteredImage", () => {
  it("draws the picture itself when nothing is set", () => {
    const image = picture(4, 4);
    expect(filteredImage(image, {})).toBe(image);
    expect(filteredImage(image, { chromaKey: { ...KEY, color: "nope" } })).toBe(image);
  });

  it("keys the picture and reuses the copy for the same settings", () => {
    const image = picture(4, 4);
    const keyed = filteredImage(image, { chromaKey: KEY });
    expect(firstPixel(keyed)).toEqual([0, 177, 64, 0]);
    expect(filteredImage(image, { chromaKey: { ...KEY } })).toBe(keyed);
    expect(filteredImage(image, { chromaKey: { ...KEY, tolerance: 30 } })).not.toBe(keyed);
    expect(filteredImage(image, { chromaKey: { ...KEY, softness: 0 } })).not.toBe(keyed);
  });

  it("keys before painting the flat colour", () => {
    const result = filteredImage(picture(4, 4), { chromaKey: KEY, tint: "#ff0000" });
    expect(firstPixel(result)).toEqual([255, 0, 0, 0]);
  });

  it("makes a smaller draft of a big picture until the full copy exists", () => {
    const image = picture(2048, 1152);
    const draft = filteredImage(image, { chromaKey: KEY }, { draft: true }) as HTMLCanvasElement;
    expect([draft.width, draft.height]).toEqual([1024, 576]);
    expect(filteredImage(image, { chromaKey: KEY }, { draft: true })).toBe(draft);
    const full = filteredImage(image, { chromaKey: KEY }) as HTMLCanvasElement;
    expect([full.width, full.height]).toEqual([2048, 1152]);
    expect(filteredImage(image, { chromaKey: KEY }, { draft: true })).toBe(full);
  });

  it("keeps small pictures at full size even for a draft", () => {
    const draft = filteredImage(picture(800, 600), { chromaKey: KEY }, { draft: true }) as HTMLCanvasElement;
    expect([draft.width, draft.height]).toEqual([800, 600]);
  });
});
