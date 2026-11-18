import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTextElement } from "../model/element-factories";
import { click, doubleClick, input, load, rect, store } from "./click-test-kit";
import { useEditorUiStore } from "./editor-ui-store";
import {
  cancelElementStep,
  clickElement,
  doubleClickElement,
  DOUBLE_CLICK_MS,
  pressElement,
  resetElementClicks,
} from "./element-clicks";

const editing = () => useEditorUiStore.getState().editingTextId;
const text = (id: string) => createTextElement({ id, width: 100 });

describe("element double clicks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetElementClicks();
    useEditorUiStore.getState().setEditingText(null);
    load([rect("image"), rect("lower"), rect("upper")]);
  });

  afterEach(() => vi.useRealTimers());

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

  it("waits out the double click window before stepping from a grouped element", () => {
    store().groupElements(["lower", "upper"]);
    const press = input("upper");
    pressElement(press);
    clickElement(press);
    expect(store().selectedIds).toEqual(["lower", "upper"]);
    vi.advanceTimersByTime(DOUBLE_CLICK_MS);
    expect(store().selectedIds).toEqual(["image"]);
  });

  it("drops a waiting step when a transform starts", () => {
    load([rect("box"), text("text")]);
    store().setSelection(["text"]);
    pressElement(input("text"));
    clickElement(input("text"));
    cancelElementStep();
    vi.advanceTimersByTime(DOUBLE_CLICK_MS * 2);
    expect(store().selectedIds).toEqual(["text"]);
  });

  it("picks a grouped element out on double click instead of stepping", () => {
    store().groupElements(["lower", "upper"]);
    doubleClick("upper");
    vi.advanceTimersByTime(DOUBLE_CLICK_MS * 2);
    expect(store().selectedIds).toEqual(["upper"]);
  });

  it("edits text on double click, selected first or not", () => {
    load([rect("image"), text("text")]);
    for (const selectedFirst of [false, true]) {
      useEditorUiStore.getState().setEditingText(null);
      store().setSelection(selectedFirst ? ["text"] : []);
      doubleClick("text", { point: { x: 20, y: 20 } });
      vi.advanceTimersByTime(DOUBLE_CLICK_MS * 2);
      expect(store().selectedIds).toEqual(["text"]);
      expect(editing()).toBe("text");
    }
  });

  it("edits a text stepped to under another element", () => {
    load([text("text"), rect("box")]);
    click("box");
    click("box");
    expect(store().selectedIds).toEqual(["text"]);
    doubleClick("box");
    expect(store().selectedIds).toEqual(["text"]);
    expect(editing()).toBe("text");
    vi.advanceTimersByTime(DOUBLE_CLICK_MS * 2);
    expect(store().selectedIds).toEqual(["text"]);
  });

  it("waits before stepping away from a stepped text, so a double click can follow", () => {
    load([rect("image"), text("text"), rect("box")]);
    click("box");
    click("box");
    pressElement(input("box"));
    clickElement(input("box"));
    vi.advanceTimersByTime(DOUBLE_CLICK_MS - 1);
    expect(store().selectedIds).toEqual(["text"]);
    vi.advanceTimersByTime(1);
    expect(store().selectedIds).toEqual(["image"]);
  });

  it("picks out the member of a group stepped to under another element", () => {
    load([rect("g1"), rect("g2"), rect("box")]);
    store().groupElements(["g1", "g2"]);
    store().clearSelection();
    click("box");
    click("box");
    expect(store().selectedIds).toEqual(["g1", "g2"]);
    doubleClick("box");
    expect(store().selectedIds).toEqual(["g2"]);
  });

  it("ignores the double click Konva reports after a drag on a locked element", () => {
    load([rect("g1"), rect("g2", { locked: true })]);
    store().groupElements(["g1", "g2"]);
    store().clearSelection();
    pressElement(input("g2"));
    clickElement(input("g2"));
    pressElement(input("g2"));
    clickElement(input("g2", { point: { x: 90, y: 90 } }));
    doubleClickElement("g2");
    expect(store().selectedIds).toEqual(["g1", "g2"]);
  });

  it("ignores the double click Konva reports after a right click", () => {
    load([text("text")]);
    pressElement(input("text", { button: 2 }));
    clickElement(input("text", { button: 2 }));
    pressElement(input("text"));
    clickElement(input("text"));
    doubleClickElement("text");
    expect(editing()).toBeNull();
  });
});
