import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createShapeElement, createTextElement } from "../model/element-factories";
import { click, input, load, rect, store } from "./click-test-kit";
import { useEditorUiStore } from "./editor-ui-store";
import {
  clickElement,
  doubleClickElement,
  DOUBLE_CLICK_MS,
  pressElement,
  pressKeepsSelection,
  resetElementClicks,
  selectForMenu,
} from "./element-clicks";

describe("element clicks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetElementClicks();
    useEditorUiStore.getState().setEditingText(null);
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

  it("does not step on the second click of a double click", () => {
    click("upper");
    const press = input("upper");
    pressElement(press);
    clickElement(press);
    expect(store().selectedIds).toEqual(["lower"]);
    pressElement(press);
    clickElement(press);
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

  it("waits out the double click window before stepping from a grouped element", () => {
    store().groupElements(["lower", "upper"]);
    const press = input("upper");
    pressElement(press);
    clickElement(press);
    expect(store().selectedIds).toEqual(["lower", "upper"]);
    vi.advanceTimersByTime(DOUBLE_CLICK_MS);
    expect(store().selectedIds).toEqual(["image"]);
  });

  it("picks a grouped element out on double click instead of stepping", () => {
    store().groupElements(["lower", "upper"]);
    const press = input("upper");
    pressElement(press);
    clickElement(press);
    pressElement(press);
    clickElement(press);
    doubleClickElement("upper");
    vi.advanceTimersByTime(DOUBLE_CLICK_MS * 2);
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("edits text on double click, selected first or not", () => {
    load([rect("image"), createTextElement({ id: "text" })]);
    const press = input("text", { point: { x: 20, y: 20 } });
    for (const selectedFirst of [false, true]) {
      useEditorUiStore.getState().setEditingText(null);
      store().setSelection(selectedFirst ? ["text"] : []);
      pressElement(press);
      clickElement(press);
      pressElement(press);
      clickElement(press);
      doubleClickElement("text");
      vi.advanceTimersByTime(DOUBLE_CLICK_MS * 2);
      expect(store().selectedIds).toEqual(["text"]);
      expect(useEditorUiStore.getState().editingTextId).toBe("text");
    }
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
