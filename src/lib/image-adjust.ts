/**
 * Colour changes for a photo, done pixel by pixel: one flat colour over
 * everything, or a shift in brightness, contrast, saturation and hue. The
 * same maths runs on the canvas and in exports, so they match.
 */

/** How far each slider goes, in the units the sliders show. */
export interface ImageAdjust {
  /** -100 (black) to 100 (white), added to every channel. */
  brightness: number;
  /** -100 (flat grey) to 100 (doubled). */
  contrast: number;
  /** 0 (greyscale) to 200, with 100 as the picture is. */
  saturation: number;
  /** -180 to 180 degrees around the colour wheel. */
  hue: number;
}

export const DEFAULT_ADJUST: ImageAdjust = { brightness: 0, contrast: 0, saturation: 100, hue: 0 };

/** The slider ranges, in the same order the panel shows them. */
export const ADJUST_FIELDS: { key: keyof ImageAdjust; label: string; min: number; max: number; suffix: string }[] = [
  { key: "brightness", label: "Brightness", min: -100, max: 100, suffix: "" },
  { key: "contrast", label: "Contrast", min: -100, max: 100, suffix: "" },
  { key: "saturation", label: "Saturation", min: 0, max: 200, suffix: "%" },
  { key: "hue", label: "Hue", min: -180, max: 180, suffix: "°" },
];

/** True when the adjustment would change nothing. */
export function isDefaultAdjust(adjust: ImageAdjust | undefined): boolean {
  if (!adjust) return true;
  return ADJUST_FIELDS.every((field) => adjust[field.key] === DEFAULT_ADJUST[field.key]);
}

/** Red, green and blue from a #rgb or #rrggbb string, or null for anything else. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].split("").map((d) => d + d).join("") : match[1];
  return [parseInt(digits.slice(0, 2), 16), parseInt(digits.slice(2, 4), 16), parseInt(digits.slice(4, 6), 16)];
}

/** The 3 by 3 matrix that turns colours around the wheel by the given degrees. */
function hueMatrix(degrees: number): number[] {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
  ];
}

function clamp(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/**
 * Applies the adjustment to RGBA pixels in place: hue first, then
 * saturation, brightness and contrast. Alpha is left alone.
 */
export function adjustPixels(data: Uint8ClampedArray, adjust: ImageAdjust): void {
  const rotate = adjust.hue !== 0;
  const m = hueMatrix(adjust.hue);
  const saturation = adjust.saturation / 100;
  const brightness = (adjust.brightness / 100) * 255;
  const contrast = 1 + adjust.contrast / 100;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    if (rotate) {
      const r0 = r;
      const g0 = g;
      const b0 = b;
      r = m[0] * r0 + m[1] * g0 + m[2] * b0;
      g = m[3] * r0 + m[4] * g0 + m[5] * b0;
      b = m[6] * r0 + m[7] * g0 + m[8] * b0;
    }
    if (saturation !== 1) {
      const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = grey + (r - grey) * saturation;
      g = grey + (g - grey) * saturation;
      b = grey + (b - grey) * saturation;
    }
    data[i] = clamp((r + brightness - 128) * contrast + 128);
    data[i + 1] = clamp((g + brightness - 128) * contrast + 128);
    data[i + 2] = clamp((b + brightness - 128) * contrast + 128);
  }
}

/** Paints every pixel one colour, keeping its transparency. */
export function tintPixels(data: Uint8ClampedArray, [r, g, b]: [number, number, number]): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}
