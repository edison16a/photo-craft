import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createShapeElement } from "../model/element-factories";
import { click, input, load, rect, store } from "./click-test-kit";
import { useEditorUiStore } from "./editor-ui-store";
import { clickElement, pressElement, pressKeepsSelection, resetElementClicks, selectForMenu } from "./element-clicks";

describe("element clicks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetElementClicks();
    useEditorUiStore.getState().setEditingText(null);
    useEditorUiStore.getState().setViewport(1, { x: 0, y: 0 });
    load([rect("image"), rect("lower"), rect("upper")]);
  });

  afterEach(() => vi.useRealTimers());

  it("selects the top element, then steps down and wraps, while Konva keeps hitting the top", () => {
    click("upper");
    expect(store().selectedIds).toEqual(["upper"]);
    click("upper");
    expect(store().selectedIds).toEqual(["lower"]);
    click("upper");
    expect(store().selectedIds).toEqual(["image"]);
    click("upper");
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("keeps the stepped selection for a drag from the same spot", () => {
    click("upper");
    click("upper");
    pressElement(input("upper"));
    expect(pressKeepsSelection()).toBe(true);
    expect(store().selectedIds).toEqual(["lower"]);
  });

  it("does not keep the stepped selection for a press somewhere else", () => {
    click("upper");
    click("upper");
    pressElement(input("upper", { point: { x: 90, y: 90 } }));
    expect(pressKeepsSelection()).toBe(false);
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("keeps the stepped selection for a drag only where it is drawn", () => {
    click("upper");
    click("upper");
    pressElement(input("upper", { under: () => ["image", "upper"] }));
    expect(pressKeepsSelection()).toBe(false);
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("steps only through elements drawn under the pointer", () => {
    // The ellipse's box covers the corner, but only the rectangle is drawn there.
    load([rect("rect"), createShapeElement("ellipse", { id: "ellipse", width: 100, height: 100 })]);
    const corner = { point: { x: 4, y: 4 }, under: () => ["rect"] };
    click("rect", corner);
    click("rect", corner);
    expect(store().selectedIds).toEqual(["rect"]);
    pressElement(input("rect", corner));
    expect(pressKeepsSelection()).toBe(false);
  });

  it("does not count a release that moved as far as a drag as a click", () => {
    click("upper");
    pressElement(input("upper"));
    clickElement(input("upper", { point: { x: 53, y: 50 } }));
    expect(store().selectedIds).toEqual(["upper"]);
    // At four times zoom a page pixel is four screen pixels.
    useEditorUiStore.getState().setViewport(4, { x: 0, y: 0 });
    pressElement(input("upper"));
    clickElement(input("upper", { point: { x: 50, y: 50.75 } }));
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("still steps when the pointer moved less than a drag needs", () => {
    click("upper");
    pressElement(input("upper"));
    clickElement(input("upper", { point: { x: 52, y: 48 } }));
    expect(store().selectedIds).toEqual(["lower"]);
  });

  it("does not let a drag pair up with a click into a double click", () => {
    pressElement(input("upper"));
    clickElement(input("upper"));
    pressElement(input("upper"));
    clickElement(input("upper", { point: { x: 80, y: 80 } }));
    pressElement(input("upper"));
    clickElement(input("upper"));
    expect(store().selectedIds).toEqual(["lower"]);
  });

  it("never steps on a shift click", () => {
    click("upper");
    click("upper", { shift: true });
    expect(store().selectedIds).toEqual([]);
    click("lower", { shift: true });
    click("upper", { shift: true });
    expect(store().selectedIds).toEqual(["lower", "upper"]);
  });

  it("narrows a bigger selection to the clicked unit", () => {
    store().setSelection(["image", "upper"]);
    click("upper");
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("selects and toggles whole groups, and picks one member with Ctrl", () => {
    store().groupElements(["lower", "upper"]);
    store().clearSelection();
    click("upper");
    expect(store().selectedIds).toEqual(["lower", "upper"]);
    click("upper", { shift: true });
    expect(store().selectedIds).toEqual([]);
    click("upper", { mod: true });
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("ignores clicks from other buttons and keeps the stepped selection for a right click", () => {
    click("upper");
    click("upper");
    click("upper", { button: 2 });
    expect(store().selectedIds).toEqual(["lower"]);
    selectForMenu(input("image", { point: { x: 400, y: 400 } }));
    expect(store().selectedIds).toEqual(["image"]);
  });
});
