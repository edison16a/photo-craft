"use client";
/**
 * React hook that resolves a decoded image for a data URL through the
 * shared image cache.
 */
import { useEffect, useState } from "react";
import { getCachedImage, peekCachedImage } from "../lib/image-cache";

/** Returns the loaded image, or undefined until it is ready. */
export function useHtmlImage(src: string): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(() => peekCachedImage(src));

  useEffect(() => {
    let cancelled = false;
    const cached = peekCachedImage(src);
    if (cached) {
      setImage(cached);
      return;
    }
    getCachedImage(src)
      .then((loaded) => {
        if (!cancelled) setImage(loaded);
      })
      .catch(() => {
        if (!cancelled) setImage(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}
