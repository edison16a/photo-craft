import { describe, expect, it } from "vitest";
import { actionForKey, assignKey, coerceKeybinds, DEFAULT_KEYBINDS, isBindableKey, keyLabel } from "./keybinds";

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

  it("reads stored tables and falls back per action", () => {
    expect(coerceKeybinds(undefined)).toEqual(DEFAULT_KEYBINDS);
    expect(coerceKeybinds("nope")).toEqual(DEFAULT_KEYBINDS);
    const read = coerceKeybinds({ select: null, text: "Q", draw: "Enter", upload: 3, extra: "z" });
    expect(read).toEqual({ ...DEFAULT_KEYBINDS, select: null, text: "q" });
  });
});
