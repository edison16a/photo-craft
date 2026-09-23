/**
 * A copy of a photo with its colour changes applied, drawn once at the
 * picture's own resolution and reused by the canvas, the thumbnails and
 * the exports. A few recent variants are kept per picture so dragging a
 * slider back and forth does not redo the work.
 */
import { adjustPixels, hexToRgb, isDefaultAdjust, tintPixels } from "../image-adjust";
import type { ImageElement } from "../../model/types";

type ColorFields = Pick<ImageElement, "tint" | "adjust">;

/** How many variants of one picture are kept. */
const KEEP = 4;

const variants = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

/** True when the element draws its picture as it came. */
export function hasColorChanges(element: ColorFields): boolean {
  return Boolean(element.tint) || !isDefaultAdjust(element.adjust);
}

function variantKey(element: ColorFields): string {
  const a = element.adjust;
  return `${element.tint ?? ""}|${a ? [a.brightness, a.contrast, a.saturation, a.hue].join(",") : ""}`;
}

/** Draws the picture and runs the pixel changes over it. */
function render(image: HTMLImageElement, element: ColorFields): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const tint = element.tint ? hexToRgb(element.tint) : null;
  if (tint) tintPixels(pixels.data, tint);
  else if (element.adjust) adjustPixels(pixels.data, element.adjust);
  context.putImageData(pixels, 0, 0);
  return canvas;
}

/**
 * The picture to draw for an element: the image itself when its colours
 * are untouched, otherwise a canvas with the changes applied.
 */
export function filteredImage(image: HTMLImageElement, element: ColorFields): HTMLImageElement | HTMLCanvasElement {
  if (!hasColorChanges(element)) return image;
  let cache = variants.get(image);
  if (!cache) {
    cache = new Map();
    variants.set(image, cache);
  }
  const key = variantKey(element);
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = render(image, element);
  cache.set(key, canvas);
  if (cache.size > KEEP) cache.delete(cache.keys().next().value as string);
  return canvas;
}
