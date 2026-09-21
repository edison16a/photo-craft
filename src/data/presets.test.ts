import { describe, it, expect } from "vitest";
import {
  PRESET_CATEGORIES,
  PROJECT_SIZE_LIMITS,
  SIZE_PRESETS,
  findPreset,
} from "./presets";

describe("PROJECT_SIZE_LIMITS", () => {
  it("allows 16 to 10000 pixels", () => {
    expect(PROJECT_SIZE_LIMITS).toEqual({ min: 16, max: 10000 });
  });
});

describe("PRESET_CATEGORIES", () => {
  it("lists every category exactly once with a label", () => {
    const ids = PRESET_CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(
      ["document", "logo", "print", "screen", "social", "video"].sort(),
    );
    for (const category of PRESET_CATEGORIES) {
      expect(category.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("SIZE_PRESETS", () => {
  it("has a reasonable number of entries", () => {
    expect(SIZE_PRESETS.length).toBeGreaterThanOrEqual(24);
  });

  it("uses unique ids", () => {
    const ids = SIZE_PRESETS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses ids that are safe for settings and URLs", () => {
    for (const entry of SIZE_PRESETS) {
      expect(entry.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("keeps every size inside the project limits", () => {
    const { min, max } = PROJECT_SIZE_LIMITS;
    for (const entry of SIZE_PRESETS) {
      expect(entry.width).toBeGreaterThanOrEqual(min);
      expect(entry.width).toBeLessThanOrEqual(max);
      expect(entry.height).toBeGreaterThanOrEqual(min);
      expect(entry.height).toBeLessThanOrEqual(max);
    }
  });

  it("uses whole pixel sizes", () => {
    for (const entry of SIZE_PRESETS) {
      expect(Number.isInteger(entry.width)).toBe(true);
      expect(Number.isInteger(entry.height)).toBe(true);
    }
  });

  it("gives every entry a name and a known category", () => {
    const knownCategories = new Set(PRESET_CATEGORIES.map((c) => c.id));
    for (const entry of SIZE_PRESETS) {
      expect(entry.name.trim().length).toBeGreaterThan(0);
      expect(knownCategories.has(entry.category)).toBe(true);
    }
  });

  it("covers every category at least once", () => {
    const used = new Set(SIZE_PRESETS.map((entry) => entry.category));
    for (const category of PRESET_CATEGORIES) {
      expect(used.has(category.id)).toBe(true);
    }
  });

  it("includes the well known sizes", () => {
    const sizes = SIZE_PRESETS.map((entry) => `${entry.width}x${entry.height}`);
    expect(sizes).toContain("1080x1080");
    expect(sizes).toContain("1080x1920");
    expect(sizes).toContain("1920x1080");
    expect(sizes).toContain("3840x2160");
    expect(sizes).toContain("2480x3508");
    expect(sizes).toContain("2550x3300");
  });
});

describe("findPreset", () => {
  it("returns the matching preset", () => {
    const found = findPreset("instagram-post");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Instagram post");
    expect(found?.width).toBe(1080);
    expect(found?.height).toBe(1080);
    expect(found?.category).toBe("social");
  });

  it("finds every preset by its own id", () => {
    for (const entry of SIZE_PRESETS) {
      expect(findPreset(entry.id)).toBe(entry);
    }
  });

  it("returns undefined for unknown ids", () => {
    expect(findPreset("does-not-exist")).toBeUndefined();
    expect(findPreset("")).toBeUndefined();
    expect(findPreset("Instagram-Post")).toBeUndefined();
  });
});
