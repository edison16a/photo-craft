import { describe, expect, it } from "vitest";
import { ROTATE_HANDLE_CLEARANCE, TOOLBAR_GAP, WORKSPACE_PADDING, positionToolbar } from "./toolbar-position";

const workspace = { width: 1000, height: 700 };
const toolbar = { width: 300, height: 36 };

describe("positionToolbar", () => {
  it("floats below the selection, centred", () => {
    const placement = positionToolbar({ x: 400, y: 300, width: 200, height: 100 }, toolbar, workspace);
    expect(placement).toEqual({ top: 300 + 100 + TOOLBAR_GAP, left: 400 + 100 - 150 });
  });

  it("moves above, clear of the rotate handle, when the selection touches the bottom", () => {
    const placement = positionToolbar({ x: 400, y: 600, width: 200, height: 100 }, toolbar, workspace);
    expect(placement.top).toBe(600 - TOOLBAR_GAP - ROTATE_HANDLE_CLEARANCE - 36);
  });

  it("stays inside the workspace at the sides", () => {
    const left = positionToolbar({ x: -100, y: 300, width: 50, height: 50 }, toolbar, workspace);
    expect(left.left).toBe(WORKSPACE_PADDING);
    const right = positionToolbar({ x: 990, y: 300, width: 50, height: 50 }, toolbar, workspace);
    expect(right.left).toBe(1000 - 300 - WORKSPACE_PADDING);
  });

  it("never leaves the workspace when the selection is off screen", () => {
    const below = positionToolbar({ x: 400, y: 2000, width: 200, height: 100 }, toolbar, workspace);
    expect(below.top).toBe(700 - 36 - WORKSPACE_PADDING);
    const above = positionToolbar({ x: 400, y: -500, width: 200, height: 100 }, toolbar, workspace);
    expect(above.top).toBe(WORKSPACE_PADDING);
  });
});
