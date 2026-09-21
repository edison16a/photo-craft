/**
 * Shared cache of decoded images keyed by data URL. The editor and the
 * export renderer both read from it so an image is decoded once.
 */
import { loadHtmlImage } from "./image-loading";

const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();

/** Returns a cached image without loading. */
export function peekCachedImage(src: string): HTMLImageElement | undefined {
  return cache.get(src);
}

/** Resolves an image from cache, or loads it once and caches it. */
export function getCachedImage(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(src);
  if (inflight) return inflight;
  const promise = loadHtmlImage(src)
    .then((image) => {
      cache.set(src, image);
      pending.delete(src);
      return image;
    })
    .catch((error: unknown) => {
      pending.delete(src);
      throw error;
    });
  pending.set(src, promise);
  return promise;
}
