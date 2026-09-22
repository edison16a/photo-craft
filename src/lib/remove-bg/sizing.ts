/**
 * Output sizes for cutouts: a width and height that keep the picture's
 * proportions, however the user asks for them.
 */

export interface Size {
  width: number;
  height: number;
}

/** Largest side we will render on download. Keeps canvases inside browser limits. */
export const MAX_OUTPUT_SIDE = 8192;

function clampSide(value: number): number {
  return Math.min(MAX_OUTPUT_SIDE, Math.max(1, Math.round(value)));
}

/** A size with the given width and a height that keeps the original proportions. */
export function sizeFromWidth(original: Size, width: number): Size {
  const clamped = clampSide(width);
  return { width: clamped, height: clampSide((clamped * original.height) / original.width) };
}

/** A size with the given height and a width that keeps the original proportions. */
export function sizeFromHeight(original: Size, height: number): Size {
  const clamped = clampSide(height);
  return { width: clampSide((clamped * original.width) / original.height), height: clamped };
}

/** The original scaled by a factor, so 0.5 halves it and 2 doubles it. */
export function sizeFromScale(original: Size, scale: number): Size {
  return sizeFromWidth(original, original.width * scale);
}

/** How much a chosen size scales the original, by width. */
export function scaleOf(original: Size, chosen: Size): number {
  return chosen.width / original.width;
}
