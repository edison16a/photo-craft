import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { click, input, load, rect, store } from "./click-test-kit";
import { pressElement, pressKeepsSelection, resetElementClicks } from "./element-clicks";
import { rememberStep, selectedBeneath } from "./stepped-selection";

describe("stepped selection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetElementClicks();
    load([rect("bottom"), rect("middle"), rect("top")]);
  });

  afterEach(() => vi.useRealTimers());

  it("forgets the step once the selection is made again another way", () => {
    click("top");
    click("top");
    expect(store().selectedIds).toEqual(["middle"]);
    store().updateElement("middle", { x: 30 });
    store().clearSelection();
    click("middle", { point: { x: 120, y: 50 }, under: () => ["middle"] });
    expect(store().selectedIds).toEqual(["middle"]);
    click("top");
    expect(store().selectedIds).toEqual(["top"]);
  });

  it("lets a drag from the old spot move the top element once the step is forgotten", () => {
    click("top");
    click("top");
    store().clearSelection();
    store().setSelection(["middle"]);
    pressElement(input("top"));
    expect(pressKeepsSelection()).toBe(false);
    expect(store().selectedIds).toEqual(["top"]);
  });

  it("only matches the very selection array the step left", () => {
    const elements = store().project?.pages[0].elements ?? [];
    const selection = ["middle"];
    rememberStep({ x: 50, y: 50 }, selection);
    expect(selectedBeneath(elements, selection, input("top"))).toBe("middle");
    expect(selectedBeneath(elements, ["middle"], input("top"))).toBeUndefined();
  });
});
