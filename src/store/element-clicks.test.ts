import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createShapeElement, createTextElement } from "../model/element-factories";
import { createProject } from "../model/project-factories";
import { useEditorUiStore } from "./editor-ui-store";
import {
  clickElement,
  doubleClickElement,
  DOUBLE_CLICK_MS,
  pressElement,
  pressKeepsSelection,
  resetElementClicks,
  selectForMenu,
  type PointerInput,
} from "./element-clicks";
import { useProjectStore } from "./project-store";

const store = () => useProjectStore.getState();
const at = { x: 50, y: 50 };

/** A press and release on one element, as Konva reports it, then a pause long enough to not be a double click. */
function click(id: string, extra: Partial<PointerInput> = {}) {
  const input = { id, point: at, button: 0, shift: false, mod: false, ...extra };
  pressElement(input);
  clickElement(input);
  vi.advanceTimersByTime(DOUBLE_CLICK_MS + 1);
}

function load(elements: ReturnType<typeof createShapeElement | typeof createTextElement>[]) {
  store().loadProject(createProject("Test", 800, 600));
  store().addElements(elements, false);
}

const rect = (id: string, extra = {}) => createShapeElement("rectangle", { id, width: 100, height: 100, ...extra });

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
    pressElement({ id: "upper", point: at, button: 0, shift: false, mod: false });
    expect(pressKeepsSelection()).toBe(true);
    expect(store().selectedIds).toEqual(["lower"]);
  });

  it("does not keep the stepped selection for a press somewhere else", () => {
    click("upper");
    click("upper");
    pressElement({ id: "upper", point: { x: 90, y: 90 }, button: 0, shift: false, mod: false });
    expect(pressKeepsSelection()).toBe(false);
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("does not step on the second click of a double click", () => {
    click("upper");
    const input = { id: "upper", point: at, button: 0, shift: false, mod: false };
    pressElement(input);
    clickElement(input);
    expect(store().selectedIds).toEqual(["lower"]);
    pressElement(input);
    clickElement(input);
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
    const input = { id: "upper", point: at, button: 0, shift: false, mod: false };
    pressElement(input);
    clickElement(input);
    expect(store().selectedIds).toEqual(["lower", "upper"]);
    vi.advanceTimersByTime(DOUBLE_CLICK_MS);
    expect(store().selectedIds).toEqual(["image"]);
  });

  it("picks a grouped element out on double click instead of stepping", () => {
    store().groupElements(["lower", "upper"]);
    const input = { id: "upper", point: at, button: 0, shift: false, mod: false };
    pressElement(input);
    clickElement(input);
    pressElement(input);
    clickElement(input);
    doubleClickElement("upper");
    vi.advanceTimersByTime(DOUBLE_CLICK_MS * 2);
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("edits text on double click, selected first or not", () => {
    load([rect("image"), createTextElement({ id: "text" })]);
    const input = { id: "text", point: { x: 20, y: 20 }, button: 0, shift: false, mod: false };
    for (const selectedFirst of [false, true]) {
      useEditorUiStore.getState().setEditingText(null);
      store().setSelection(selectedFirst ? ["text"] : []);
      pressElement(input);
      clickElement(input);
      pressElement(input);
      clickElement(input);
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
    selectForMenu("image", { x: 400, y: 400 });
    expect(store().selectedIds).toEqual(["image"]);
  });
});
