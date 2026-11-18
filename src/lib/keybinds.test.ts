import { describe, expect, it } from "vitest";
import { actionForKey, assignKey, coerceKeybinds, DEFAULT_KEYBINDS, isBindableKey, KEYBIND_SPECS, keyLabel } from "./keybinds";

describe("keybinds", () => {
  it("accepts single printable characters only", () => {
    expect(isBindableKey("s")).toBe(true);
    expect(isBindableKey("7")).toBe(true);
    expect(isBindableKey("/")).toBe(true);
    expect(isBindableKey(" ")).toBe(false);
    expect(isBindableKey("Shift")).toBe(false);
    expect(isBindableKey("Enter")).toBe(false);
    expect(isBindableKey("")).toBe(false);
  });

  it("finds the action for a key whatever its case", () => {
    expect(actionForKey(DEFAULT_KEYBINDS, "S")).toBe("select");
    expect(actionForKey(DEFAULT_KEYBINDS, "r")).toBe("removeBackground");
    expect(actionForKey(DEFAULT_KEYBINDS, "x")).toBeNull();
    expect(actionForKey({ ...DEFAULT_KEYBINDS, select: null }, "s")).toBeNull();
  });

  it("moves a key between actions and can unset one", () => {
    const moved = assignKey(DEFAULT_KEYBINDS, "draw", "S");
    expect(moved.draw).toBe("s");
    expect(moved.select).toBeNull();
    expect(DEFAULT_KEYBINDS.select).toBe("s");
    const cleared = assignKey(moved, "draw", null);
    expect(cleared.draw).toBeNull();
    expect(keyLabel("s")).toBe("S");
  });

  it("lists chroma key with the image actions, unset until the user picks a key", () => {
    expect(KEYBIND_SPECS.find((spec) => spec.action === "chromaKey")).toEqual({ action: "chromaKey", label: "Chroma key", group: "Image" });
    expect(DEFAULT_KEYBINDS.chromaKey).toBeNull();
    const bound = assignKey(DEFAULT_KEYBINDS, "chromaKey", "K");
    expect(actionForKey(bound, "k")).toBe("chromaKey");
    expect(assignKey(bound, "chromaKey", "r").removeBackground).toBeNull();
  });

  it("reads stored tables and falls back per action", () => {
    expect(coerceKeybinds(undefined)).toEqual(DEFAULT_KEYBINDS);
    expect(coerceKeybinds("nope")).toEqual(DEFAULT_KEYBINDS);
    const read = coerceKeybinds({ select: null, text: "Q", draw: "Enter", upload: 3, extra: "z" });
    expect(read).toEqual({ ...DEFAULT_KEYBINDS, select: null, text: "q" });
    // Tables saved before chroma key existed leave it unset.
    expect(coerceKeybinds({ select: "s" }).chromaKey).toBeNull();
    expect(coerceKeybinds({ chromaKey: "k" }).chromaKey).toBe("k");
  });
});
