/**
 * Colour data for the swatch grid and the colour picker.
 *
 * The big palette is generated instead of typed out so this file stays
 * short and the rows line up in a predictable way. Every colour is a
 * lowercase six digit hex string like "#ff0000", ready to drop into a
 * Konva fill or a CSS background without further checks.
 */

/** How many swatches sit in one row of the palette grid. */
export const PALETTE_COLUMNS = 12;

/** Number of hue rows in the generated palette. 24 rows means one every 15 degrees. */
const HUE_COUNT = 24;

/** Saturation used for every coloured row, in percent. */
const ROW_SATURATION = 85;

/** Lightest shade at the left of a coloured row, in percent. */
const ROW_LIGHTEST = 92;

/** Darkest shade at the right of a coloured row, in percent. */
const ROW_DARKEST = 15;

/** Matches "#rgb" or "#rrggbb" in either case. */
const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Turns a 0 to 255 channel value into two lowercase hex digits. */
function channelToHex(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, "0");
}

/**
 * Converts an HSL colour to a lowercase hex string.
 *
 * Hue is in degrees and wraps around, so 360 and -120 both work.
 * Saturation and lightness are percentages from 0 to 100 and anything
 * outside that range is clamped. Non finite input gives black rather than
 * a broken string. hslToHex(0, 100, 50) is "#ff0000".
 */
export function hslToHex(h: number, s: number, l: number): string {
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) {
    return "#000000";
  }
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const chroma = sat * Math.min(light, 1 - light);
  const channel = (offset: number): number => {
    const k = (offset + hue / 30) % 12;
    const value = light - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return value * 255;
  };
  const red = channelToHex(channel(0));
  const green = channelToHex(channel(8));
  const blue = channelToHex(channel(4));
  return `#${red}${green}${blue}`;
}

/**
 * Tells you whether a string is a hex colour we accept: "#rgb" or
 * "#rrggbb", upper or lower case. No whitespace, no alpha, no names.
 */
export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value);
}

/**
 * Cleans up a hex colour so equal colours compare equal as strings.
 * Lowercases the digits and expands the short form, so "#ABC" becomes
 * "#aabbcc". Anything that fails isValidHex comes back as "".
 */
export function normalizeHex(value: string): string {
  if (!isValidHex(value)) {
    return "";
  }
  const digits = value.slice(1).toLowerCase();
  if (digits.length === 6) {
    return `#${digits}`;
  }
  const expanded = digits
    .split("")
    .map((digit) => digit + digit)
    .join("");
  return `#${expanded}`;
}

/**
 * Builds the full swatch palette, 300 colours in rows of PALETTE_COLUMNS.
 *
 * The first row is 12 greys from white down to black. After that come 24
 * hue rows, one every 15 degrees starting at red. Each hue row runs from a
 * light tint on the left to a dark shade on the right at a fixed
 * saturation. Row order is stable so the grid always looks the same.
 */
export function generatePalette(): string[] {
  const colors: string[] = [];
  const greyStep = 100 / (PALETTE_COLUMNS - 1);
  for (let index = 0; index < PALETTE_COLUMNS; index += 1) {
    colors.push(hslToHex(0, 0, 100 - index * greyStep));
  }
  const hueStep = 360 / HUE_COUNT;
  const shadeStep = (ROW_LIGHTEST - ROW_DARKEST) / (PALETTE_COLUMNS - 1);
  for (let hueIndex = 0; hueIndex < HUE_COUNT; hueIndex += 1) {
    const hue = hueIndex * hueStep;
    for (let shade = 0; shade < PALETTE_COLUMNS; shade += 1) {
      const lightness = ROW_LIGHTEST - shade * shadeStep;
      colors.push(hslToHex(hue, ROW_SATURATION, lightness));
    }
  }
  return colors;
}

/** The generated palette, computed once so the swatch grid can reuse it. */
export const COLOR_PALETTE: string[] = generatePalette();

/**
 * A dozen handy colours shown above the big grid: white, black, a couple
 * of blues, and the accent colours the UI itself uses.
 */
export const QUICK_COLORS: string[] = [
  "#ffffff",
  "#000000",
  "#4da3ff",
  "#2b8cff",
  "#e5484d",
  "#f5a524",
  "#17c964",
  "#7828c8",
  "#f31260",
  "#06b6d4",
  "#a855f7",
  "#9aa3b2",
];
