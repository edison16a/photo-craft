import { beforeEach, describe, expect, it } from "vitest";
import { useEditorUiStore } from "./editor-ui-store";

const store = () => useEditorUiStore.getState();

describe("editor ui store", () => {
  beforeEach(() => {
    useEditorUiStore.setState({ tool: "select", panel: "page", interacting: false, contextMenu: null, busyImageIds: [] });
  });

  it("opens the panel that belongs to the chosen tool", () => {
    store().setTool("text");
    expect(store().panel).toBe("text");
    store().setTool("select");
    expect(store().panel).toBe("page");
  });

  it("keeps the same state object when nothing changes", () => {
    const before = store();
    store().setInteracting(false);
    store().closeContextMenu();
    expect(store()).toBe(before);
    store().setInteracting(true);
    expect(store().interacting).toBe(true);
  });

  it("clamps the zoom to the allowed range", () => {
    store().setViewport(100, { x: 0, y: 0 });
    expect(store().zoom).toBe(8);
    store().setViewport(0, { x: 0, y: 0 });
    expect(store().zoom).toBe(0.05);
  });

  it("marks an image busy once and clears it again", () => {
    store().setImageBusy("img", true);
    store().setImageBusy("img", true);
    expect(store().busyImageIds).toEqual(["img"]);
    store().setImageBusy("img", false);
    expect(store().busyImageIds).toEqual([]);
  });

  it("keeps other busy images when one finishes", () => {
    store().setImageBusy("a", true);
    store().setImageBusy("b", true);
    store().setImageBusy("a", false);
    expect(store().busyImageIds).toEqual(["b"]);
  });
});
