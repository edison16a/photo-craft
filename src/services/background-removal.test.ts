import { beforeEach, describe, expect, it } from "vitest";
import { currentModelTier } from "./background-removal";
import { loadSettings, saveSettings } from "./settings";

describe("currentModelTier", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses the picked model", () => {
    saveSettings({ backgroundModel: "light" });
    expect(currentModelTier()).toBe("light");
  });

  it("falls back to the default and picks it again when none is picked", () => {
    saveSettings({ backgroundModel: null });
    expect(loadSettings().backgroundModel).toBeNull();
    expect(currentModelTier()).toBe("best");
    expect(loadSettings().backgroundModel).toBe("best");
  });
});
