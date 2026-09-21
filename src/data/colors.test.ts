import { describe, it, expect } from "vitest";
import {
  COLOR_PALETTE,
  PALETTE_COLUMNS,
  QUICK_COLORS,
  generatePalette,
  hslToHex,
  isValidHex,
  normalizeHex,
} from "./colors";

/** Splits a flat palette into rows of PALETTE_COLUMNS entries. */
function toRows(colors: string[]): string[][] {
  const rows: string[][] = [];
  for (let index = 0; index < colors.length; index += PALETTE_COLUMNS) {
    rows.push(colors.slice(index, index + PALETTE_COLUMNS));
  }
  return rows;
}

/** Red, green and blue channels of a six digit hex colour. */
function channels(hex: string): [number, number, number] {
  const digits = hex.slice(1);
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
}

/** Sum of the three channels, enough to compare how light two colours are. */
function brightness(hex: string): number {
  const [red, green, blue] = channels(hex);
  return red + green + blue;
}

/** True when every entry is darker than the one before it. */
function strictlyDarkening(row: string[]): boolean {
  return row.every(
    (color, index) => index === 0 || brightness(color) < brightness(row[index - 1]),
  );
}

describe("hslToHex", () => {
  it("converts pure red", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
  });

  it("converts pure green and blue", () => {
    expect(hslToHex(120, 100, 50)).toBe("#00ff00");
    expect(hslToHex(240, 100, 50)).toBe("#0000ff");
  });

  it("gives white, black and mid grey when saturation is zero", () => {
    expect(hslToHex(0, 0, 100)).toBe("#ffffff");
    expect(hslToHex(0, 0, 0)).toBe("#000000");
    expect(hslToHex(200, 0, 50)).toBe("#808080");
  });

  it("wraps hue past 360 and below 0", () => {
    expect(hslToHex(360, 100, 50)).toBe("#ff0000");
    expect(hslToHex(-240, 100, 50)).toBe(hslToHex(120, 100, 50));
  });

  it("clamps saturation and lightness into range", () => {
    expect(hslToHex(0, 150, 50)).toBe("#ff0000");
    expect(hslToHex(0, 100, 200)).toBe("#ffffff");
    expect(hslToHex(0, -20, -5)).toBe("#000000");
  });

  it("falls back to black for non finite input", () => {
    expect(hslToHex(Number.NaN, 50, 50)).toBe("#000000");
    expect(hslToHex(0, Number.POSITIVE_INFINITY, 50)).toBe("#000000");
  });

  it("always returns lowercase six digit hex", () => {
    expect(hslToHex(33, 70, 61)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("isValidHex", () => {
  it("accepts short and long forms in either case", () => {
    expect(isValidHex("#abc")).toBe(true);
    expect(isValidHex("#ABC")).toBe(true);
    expect(isValidHex("#aabbcc")).toBe(true);
    expect(isValidHex("#AaBbCc")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isValidHex("")).toBe(false);
    expect(isValidHex("abc")).toBe(false);
    expect(isValidHex("#abcd")).toBe(false);
    expect(isValidHex("#aabbccdd")).toBe(false);
    expect(isValidHex("#ggg")).toBe(false);
    expect(isValidHex(" #abc")).toBe(false);
    expect(isValidHex("red")).toBe(false);
  });
});

describe("normalizeHex", () => {
  it("expands and lowercases the short form", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("#f0a")).toBe("#ff00aa");
  });

  it("lowercases the long form", () => {
    expect(normalizeHex("#AABBCC")).toBe("#aabbcc");
    expect(normalizeHex("#123456")).toBe("#123456");
  });

  it("returns an empty string for invalid input", () => {
    expect(normalizeHex("")).toBe("");
    expect(normalizeHex("abc")).toBe("");
    expect(normalizeHex("#abcd")).toBe("");
    expect(normalizeHex("#xyz")).toBe("");
  });
});

describe("generatePalette", () => {
  const palette = generatePalette();
  const rows = toRows(palette);

  it("returns 300 colours in complete rows of 12", () => {
    expect(PALETTE_COLUMNS).toBe(12);
    expect(palette).toHaveLength(300);
    expect(palette.length % PALETTE_COLUMNS).toBe(0);
    expect(rows).toHaveLength(25);
  });

  it("returns only valid, already normalized hex strings", () => {
    for (const color of palette) {
      expect(isValidHex(color)).toBe(true);
      expect(normalizeHex(color)).toBe(color);
    }
  });

  it("has no duplicates within a row", () => {
    for (const row of rows) {
      expect(new Set(row).size).toBe(row.length);
    }
  });

  it("starts with a grey row from white to black", () => {
    const greys = rows[0];
    expect(greys[0]).toBe("#ffffff");
    expect(greys[greys.length - 1]).toBe("#000000");
    for (const grey of greys) {
      const [red, green, blue] = channels(grey);
      expect(red).toBe(green);
      expect(green).toBe(blue);
    }
    expect(strictlyDarkening(greys)).toBe(true);
  });

  it("gives each hue row shades from light to dark", () => {
    for (const row of rows.slice(1)) {
      expect(strictlyDarkening(row)).toBe(true);
    }
  });

  it("covers 24 hues fifteen degrees apart at saturation 85", () => {
    rows.slice(1).forEach((row, hueIndex) => {
      const hue = hueIndex * 15;
      expect(row[0]).toBe(hslToHex(hue, 85, 92));
      expect(row[row.length - 1]).toBe(hslToHex(hue, 85, 15));
    });
  });

  it("is deterministic", () => {
    expect(generatePalette()).toEqual(palette);
  });
});

describe("COLOR_PALETTE", () => {
  it("is the generated palette", () => {
    expect(COLOR_PALETTE).toEqual(generatePalette());
    expect(COLOR_PALETTE).toHaveLength(300);
  });
});

describe("QUICK_COLORS", () => {
  it("holds the twelve handy colours in order", () => {
    expect(QUICK_COLORS).toEqual([
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
    ]);
  });

  it("fills exactly one palette row with valid unique colours", () => {
    expect(QUICK_COLORS).toHaveLength(PALETTE_COLUMNS);
    expect(new Set(QUICK_COLORS).size).toBe(QUICK_COLORS.length);
    for (const color of QUICK_COLORS) {
      expect(isValidHex(color)).toBe(true);
      expect(normalizeHex(color)).toBe(color);
    }
  });
});
