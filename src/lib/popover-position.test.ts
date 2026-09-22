import { describe, expect, it } from "vitest";
import { POPOVER_GAP, VIEWPORT_PADDING, positionPopover } from "./popover-position";

const viewport = { width: 1000, height: 800 };
const popover = { width: 250, height: 300 };

describe("positionPopover", () => {
  it("sits below the anchor, aligned to its left edge, when there is room", () => {
    const placement = positionPopover({ top: 100, left: 100, right: 130, bottom: 130 }, popover, viewport);
    expect(placement).toEqual({ top: 130 + POPOVER_GAP, left: 100, side: "below" });
  });

  it("flips above when the space below is too small and there is more room above", () => {
    const placement = positionPopover({ top: 700, left: 100, right: 130, bottom: 730 }, popover, viewport);
    expect(placement.side).toBe("above");
    expect(placement.top).toBe(700 - POPOVER_GAP - 300);
  });

  it("lines up with the right edge of the anchor near the right side of the screen", () => {
    const placement = positionPopover({ top: 100, left: 900, right: 930, bottom: 130 }, popover, viewport);
    expect(placement.left).toBe(930 - 250);
  });

  it("clamps inside the viewport padding when the anchor is at the very edge", () => {
    const placement = positionPopover({ top: 0, left: 990, right: 1000, bottom: 10 }, popover, viewport);
    expect(placement.left).toBe(1000 - 250 - VIEWPORT_PADDING);
    expect(placement.top).toBe(10 + POPOVER_GAP);
  });

  it("never goes above the top padding even when flipped in a short viewport", () => {
    const short = { width: 1000, height: 320 };
    const placement = positionPopover({ top: 200, left: 10, right: 40, bottom: 230 }, popover, short);
    expect(placement.top).toBe(VIEWPORT_PADDING);
  });
});
