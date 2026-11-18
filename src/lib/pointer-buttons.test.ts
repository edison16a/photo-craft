import { afterEach, describe, expect, it, vi } from "vitest";
import { isMac, readButtons } from "./pointer-buttons";

const press = (extra: { button?: number; ctrlKey?: boolean; metaKey?: boolean } = {}) => ({
  button: 0,
  ctrlKey: false,
  metaKey: false,
  ...extra,
});

describe("readButtons", () => {
  it("lets Ctrl or Cmd pick one element off a Mac", () => {
    expect(readButtons(press(), false)).toEqual({ button: 0, mod: false });
    expect(readButtons(press({ ctrlKey: true }), false)).toEqual({ button: 0, mod: true });
    expect(readButtons(press({ metaKey: true }), false)).toEqual({ button: 0, mod: true });
    expect(readButtons(press({ button: 2 }), false)).toEqual({ button: 2, mod: false });
  });

  it("reads Ctrl with the main button as a right click on a Mac", () => {
    expect(readButtons(press({ ctrlKey: true }), true)).toEqual({ button: 2, mod: false });
    expect(readButtons(press({ ctrlKey: true, button: 2 }), true)).toEqual({ button: 2, mod: false });
    expect(readButtons(press({ metaKey: true }), true)).toEqual({ button: 0, mod: true });
    expect(readButtons(press(), true)).toEqual({ button: 0, mod: false });
  });

  it("reads a touch as the main button", () => {
    expect(readButtons({ ctrlKey: false, metaKey: false }, true)).toEqual({ button: 0, mod: false });
  });
});

describe("isMac", () => {
  afterEach(() => vi.restoreAllMocks());

  it("goes by the platform the browser reports", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    expect(isMac()).toBe(true);
    vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");
    expect(isMac()).toBe(false);
  });
});
