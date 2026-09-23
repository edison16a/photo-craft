/**
 * A copy of a photo painted its flat colour, drawn once at the picture's
 * own resolution and reused by the canvas, the thumbnails and the
 * exports. A few recent colours are kept per picture so switching back
 * and forth does not redo the work.
 */
import { hexToRgb, tintPixels } from "../image-tint";
import type { ImageElement } from "../../model/types";

type ColorFields = Pick<ImageElement, "tint">;

/** How many colours of one picture are kept. */
const KEEP = 4;

const variants = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

/** Draws the picture and paints it. */
function render(image: HTMLImageElement, rgb: [number, number, number]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  tintPixels(pixels.data, rgb);
  context.putImageData(pixels, 0, 0);
  return canvas;
}

/**
 * The picture to draw for an element: the image itself when it has no
 * colour set, otherwise a canvas painted that colour.
 */
export function filteredImage(image: HTMLImageElement, element: ColorFields): HTMLImageElement | HTMLCanvasElement {
  const rgb = element.tint ? hexToRgb(element.tint) : null;
  if (!rgb) return image;
  let cache = variants.get(image);
  if (!cache) {
    cache = new Map();
    variants.set(image, cache);
  }
  const key = rgb.join(",");
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = render(image, rgb);
  cache.set(key, canvas);
  if (cache.size > KEEP) cache.delete(cache.keys().next().value as string);
  return canvas;
}
