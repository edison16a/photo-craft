import { describe, expect, it } from "vitest";
import { TOOLBAR_GAP, WORKSPACE_PADDING, positionToolbar } from "./toolbar-position";

const workspace = { width: 1000, height: 700 };
const toolbar = { width: 300, height: 36 };

describe("positionToolbar", () => {
  it("floats above the selection, centred", () => {
    const placement = positionToolbar({ x: 400, y: 300, width: 200, height: 100 }, toolbar, workspace);
    expect(placement).toEqual({ top: 300 - TOOLBAR_GAP - 36, left: 400 + 100 - 150 });
  });

  it("moves below when the selection touches the top", () => {
    const placement = positionToolbar({ x: 400, y: 10, width: 200, height: 100 }, toolbar, workspace);
    expect(placement.top).toBe(10 + 100 + TOOLBAR_GAP);
  });

  it("stays inside the workspace at the sides", () => {
    const left = positionToolbar({ x: -100, y: 300, width: 50, height: 50 }, toolbar, workspace);
    expect(left.left).toBe(WORKSPACE_PADDING);
    const right = positionToolbar({ x: 990, y: 300, width: 50, height: 50 }, toolbar, workspace);
    expect(right.left).toBe(1000 - 300 - WORKSPACE_PADDING);
  });

  it("never leaves the bottom of the workspace when the selection is off screen", () => {
    const placement = positionToolbar({ x: 400, y: 2000, width: 200, height: 100 }, toolbar, workspace);
    expect(placement.top).toBe(700 - 36 - WORKSPACE_PADDING);
  });
});
