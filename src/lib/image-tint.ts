/**
 * Painting a photo one flat colour, pixel by pixel. The same maths runs
 * on the canvas and in exports, so they match.
 */

/** Red, green and blue from a #rgb or #rrggbb string, or null for anything else. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].split("").map((d) => d + d).join("") : match[1];
  return [parseInt(digits.slice(0, 2), 16), parseInt(digits.slice(2, 4), 16), parseInt(digits.slice(4, 6), 16)];
}

/** Paints every pixel one colour, keeping its transparency. */
export function tintPixels(data: Uint8ClampedArray, [r, g, b]: [number, number, number]): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}
