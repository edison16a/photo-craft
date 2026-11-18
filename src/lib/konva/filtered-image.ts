/**
 * A copy of a photo with its chroma key and flat colour applied, drawn
 * once and reused by the canvas, the thumbnails and the exports. The key
 * goes first and the colour paints what is left. A few recent versions
 * are kept per picture so switching back and forth does not redo the work.
 */
import { chromaKeyPixels, keyId } from "../chroma-key";
import { hexToRgb, tintPixels } from "../image-tint";
import type { ImageElement } from "../../model/types";

type FilterFields = Pick<ImageElement, "tint" | "chromaKey">;

/** How the caller wants the picture. */
export interface FilterOptions {
  /**
   * A quick, smaller copy is fine, for a slider that is being dragged. A
   * full size copy is still used when one is already made.
   */
  draft?: boolean;
}

/** How many full size versions of one picture are kept. */
const KEEP = 4;
/** How many draft versions of one picture are kept. */
const KEEP_DRAFTS = 2;
/** Longest side of a draft, in pixels. */
const DRAFT_SIDE = 1024;

const variants = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();
const drafts = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

/** Names the filters an element asks for, or null when it asks for none. */
function filterId(element: FilterFields): string | null {
  const rgb = element.tint ? hexToRgb(element.tint) : null;
  const key = element.chromaKey && hexToRgb(element.chromaKey.color) ? element.chromaKey : null;
  if (!rgb && !key) return null;
  return `${key ? keyId(key) : "-"}|${rgb ? rgb.join(",") : "-"}`;
}

/** Draws the picture at a size and applies the key, then the colour. */
function render(image: HTMLImageElement, element: FilterFields, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  if (element.chromaKey) chromaKeyPixels(pixels.data, element.chromaKey);
  const rgb = element.tint ? hexToRgb(element.tint) : null;
  if (rgb) tintPixels(pixels.data, rgb);
  context.putImageData(pixels, 0, 0);
  return canvas;
}

/** The cache for one picture, made on first use. */
function cacheOf(store: WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>, image: HTMLImageElement) {
  let cache = store.get(image);
  if (!cache) {
    cache = new Map();
    store.set(image, cache);
  }
  return cache;
}

/** Adds a version, dropping the oldest once there are too many. */
function remember(cache: Map<string, HTMLCanvasElement>, id: string, canvas: HTMLCanvasElement, keep: number) {
  cache.set(id, canvas);
  if (cache.size > keep) cache.delete(cache.keys().next().value as string);
}

/**
 * The picture to draw for an element: the image itself when it has no
 * key or colour set, otherwise a canvas with them applied.
 */
export function filteredImage(image: HTMLImageElement, element: FilterFields, options: FilterOptions = {}): HTMLImageElement | HTMLCanvasElement {
  const id = filterId(element);
  if (!id) return image;
  const full = cacheOf(variants, image);
  const hit = full.get(id);
  if (hit) return hit;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = DRAFT_SIDE / Math.max(width, height);
  if (options.draft && scale < 1) {
    const cache = cacheOf(drafts, image);
    const draft = cache.get(id);
    if (draft) return draft;
    const canvas = render(image, element, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    remember(cache, id, canvas, KEEP_DRAFTS);
    return canvas;
  }
  const canvas = render(image, element, width, height);
  remember(full, id, canvas, KEEP);
  return canvas;
}
