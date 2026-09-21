import { describe, it, expect } from "vitest";
import {
  FONTS,
  FONT_CATEGORIES,
  findFont,
  googleFontsCssUrl,
  type FontCategory,
} from "./fonts";

const SYSTEM_FONTS = [
  "Arial",
  "Helvetica",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Garamond",
  "Courier New",
  "Impact",
];

describe("FONT_CATEGORIES", () => {
  it("lists the five categories once each with a label", () => {
    const ids = FONT_CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(
      ["display", "handwriting", "monospace", "sans-serif", "serif"].sort(),
    );
    for (const category of FONT_CATEGORIES) {
      expect(category.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("FONTS", () => {
  it("has no duplicate families, ignoring case", () => {
    const lower = FONTS.map((font) => font.family.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it("includes the ten system fonts as source system", () => {
    const system = FONTS.filter((font) => font.source === "system");
    expect(system.map((font) => font.family).sort()).toEqual(
      [...SYSTEM_FONTS].sort(),
    );
  });

  it("offers at least 140 Google fonts", () => {
    const google = FONTS.filter((font) => font.source === "google");
    expect(google.length).toBeGreaterThanOrEqual(140);
  });

  it("uses only categories from FONT_CATEGORIES", () => {
    const known = new Set<FontCategory>(FONT_CATEGORIES.map((c) => c.id));
    for (const font of FONTS) {
      expect(known.has(font.category)).toBe(true);
    }
  });

  it("has at least one Google font in every category", () => {
    for (const category of FONT_CATEGORIES) {
      const matches = FONTS.filter(
        (font) => font.category === category.id && font.source === "google",
      );
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it("keeps family names trimmed and non empty", () => {
    for (const font of FONTS) {
      expect(font.family).toBe(font.family.trim());
      expect(font.family.length).toBeGreaterThan(0);
    }
  });

  it("groups categories in FONT_CATEGORIES order", () => {
    const order = FONT_CATEGORIES.map((category) => category.id);
    let highest = 0;
    for (const font of FONTS) {
      const index = order.indexOf(font.category);
      expect(index).toBeGreaterThanOrEqual(highest);
      highest = index;
    }
  });

  it("is sorted alphabetically within each category", () => {
    for (const category of FONT_CATEGORIES) {
      const families = FONTS.filter(
        (font) => font.category === category.id,
      ).map((font) => font.family);
      const sorted = [...families].sort((a, b) => a.localeCompare(b));
      expect(families).toEqual(sorted);
    }
  });

  it("contains a few well known Google families with the expected category", () => {
    expect(findFont("Roboto")?.category).toBe("sans-serif");
    expect(findFont("Playfair Display")?.category).toBe("serif");
    expect(findFont("Bebas Neue")?.category).toBe("display");
    expect(findFont("Pacifico")?.category).toBe("handwriting");
    expect(findFont("JetBrains Mono")?.category).toBe("monospace");
  });
});

describe("findFont", () => {
  it("finds a family by its exact name", () => {
    expect(findFont("Arial")).toEqual({
      family: "Arial",
      category: "sans-serif",
      source: "system",
    });
  });

  it("ignores case and surrounding whitespace", () => {
    expect(findFont("  open sans ")?.family).toBe("Open Sans");
  });

  it("returns undefined for unknown families", () => {
    expect(findFont("Definitely Not A Font")).toBeUndefined();
    expect(findFont("")).toBeUndefined();
  });
});

describe("googleFontsCssUrl", () => {
  it("encodes spaces as plus and asks for four faces with display swap", () => {
    expect(googleFontsCssUrl(["Open Sans"])).toBe(
      "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap",
    );
  });

  it("joins several families with additional family parameters", () => {
    const url = googleFontsCssUrl(["Roboto", "Playfair Display"]);
    expect(url).toBe(
      "https://fonts.googleapis.com/css2?" +
        "family=Roboto:ital,wght@0,400;0,700;1,400;1,700" +
        "&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700" +
        "&display=swap",
    );
  });

  it("drops blank names and repeats", () => {
    const url = googleFontsCssUrl(["Lato", " ", "Lato", ""]);
    expect(url.match(/family=/g)?.length).toBe(1);
    expect(url.endsWith("&display=swap")).toBe(true);
  });

  it("keeps digits in family names", () => {
    expect(googleFontsCssUrl(["Exo 2"])).toContain("family=Exo+2:");
  });
});
