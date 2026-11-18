/**
 * Making one colour of a picture see through. Colours are compared in
 * YCbCr with brightness counting for less than hue, so the shadows and
 * highlights on a backdrop still match the colour picked from it.
 */
import type { ChromaKey } from "../model/types";
import { hexToRgb } from "./image-tint";

/** Tolerance a new key starts with. */
export const DEFAULT_TOLERANCE = 25;
/** Softness a new key starts with. */
export const DEFAULT_SOFTNESS = 10;

/** How much a difference in brightness counts next to a difference in hue. */
const LUMA_WEIGHT = 0.5;
/** Distance per point of tolerance or softness, on the 0 to 255 colour scale. */
const STEP = 0.8;
/** At tolerance 0 a pixel this close still counts as the same colour. */
const NEAR = 2;

/**
 * How far apart two colours look for keying, on the 0 to 255 scale.
 * Differences in hue count in full and differences in brightness at
 * half.
 */
export function keyDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(squaredDistance(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
}

/** Squared key distance of a colour difference, using BT.601 weights. */
function squaredDistance(dr: number, dg: number, db: number): number {
  const dy = (0.299 * dr + 0.587 * dg + 0.114 * db) * LUMA_WEIGHT;
  const dcb = -0.168736 * dr - 0.331264 * dg + 0.5 * db;
  const dcr = 0.5 * dr - 0.418688 * dg - 0.081312 * db;
  return dy * dy + dcb * dcb + dcr * dcr;
}

/** The distances where pixels stop going fully and where they start staying. */
export function keyRange(key: Pick<ChromaKey, "tolerance" | "softness">): { inner: number; outer: number } {
  const inner = Math.max(NEAR, key.tolerance * STEP);
  return { inner, outer: inner + Math.max(0, key.softness) * STEP };
}

/**
 * How much of a pixel stays, 0 to 1, at a key distance. Within the
 * tolerance nothing stays, across the softness it fades in, past both
 * all of it stays.
 */
export function keepFactor(distance: number, key: Pick<ChromaKey, "tolerance" | "softness">): number {
  const { inner, outer } = keyRange(key);
  if (distance <= inner) return 0;
  if (distance >= outer) return 1;
  return (distance - inner) / (outer - inner);
}

/**
 * Takes the key colour out of RGBA pixels in place. Alpha is only ever
 * multiplied down, so pixels that were already see through stay that way.
 */
export function chromaKeyPixels(data: Uint8ClampedArray, key: ChromaKey): void {
  const rgb = hexToRgb(key.color);
  if (!rgb) return;
  const [kr, kg, kb] = rgb;
  const { inner, outer } = keyRange(key);
  const inner2 = inner * inner;
  const outer2 = outer * outer;
  const band = outer - inner;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    const d2 = squaredDistance(data[i] - kr, data[i + 1] - kg, data[i + 2] - kb);
    if (d2 <= inner2) data[i + 3] = 0;
    else if (d2 < outer2) data[i + 3] = Math.round((alpha * (Math.sqrt(d2) - inner)) / band);
  }
}

/** A key for a freshly picked colour, keeping the tolerance and softness of an earlier key. */
export function pickedKey(color: string, previous?: ChromaKey): ChromaKey {
  return {
    color,
    tolerance: previous?.tolerance ?? DEFAULT_TOLERANCE,
    softness: previous?.softness ?? DEFAULT_SOFTNESS,
  };
}

/** A short string that names a key, for caches. */
export function keyId(key: ChromaKey): string {
  return `${key.color.toLowerCase()}/${key.tolerance}/${key.softness}`;
}
