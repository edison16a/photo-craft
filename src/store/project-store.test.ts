import { beforeEach, describe, expect, it } from "vitest";
import { createShapeElement, createTextElement } from "../model/element-factories";
import { createProject } from "../model/project-factories";
import { useProjectStore } from "./project-store";

const store = () => useProjectStore.getState();

describe("project store", () => {
  beforeEach(() => {
    store().loadProject(createProject("Test", 800, 600));
  });

  it("adds an element, selects it and records history", () => {
    store().addElement(createShapeElement("ellipse", { id: "s1" }));
    expect(store().selectedIds).toEqual(["s1"]);
    expect(store().dirty).toBe(true);
    expect(store().canUndo()).toBe(true);
    store().undo();
    expect(store().project?.pages[0].elements).toHaveLength(0);
    store().redo();
    expect(store().project?.pages[0].elements).toHaveLength(1);
  });

  it("patches several elements in one undo step", () => {
    store().addElements([createShapeElement("rectangle", { id: "a" }), createTextElement({ id: "b" })]);
    store().patchElements({ a: { x: 5 }, b: { x: 7 } });
    const elements = store().project!.pages[0].elements;
    expect(elements.map((e) => e.x)).toEqual([5, 7]);
    store().undo();
    expect(store().project!.pages[0].elements.map((e) => e.x)).toEqual([0, 0]);
  });

  it("adds, duplicates, renames and deletes pages", () => {
    store().addPage();
    expect(store().project?.pages).toHaveLength(2);
    expect(store().currentPageId).toBe(store().project?.pages[1].id);
    store().renamePage(store().currentPageId, "Cover");
    store().duplicatePage(store().currentPageId);
    expect(store().project?.pages.map((p) => p.name)).toEqual(["Page 1", "Cover", "Cover copy"]);
    store().deletePage(store().currentPageId);
    expect(store().project?.pages).toHaveLength(2);
    expect(store().currentPageId).toBe(store().project?.pages[1].id);
  });

  it("refuses to delete the last page", () => {
    store().deletePage(store().currentPageId);
    expect(store().project?.pages).toHaveLength(1);
  });

  it("copies and pastes with an offset and new ids", () => {
    store().addElement(createShapeElement("star", { id: "s", x: 10, y: 10 }));
    store().copy(["s"]);
    store().paste();
    const elements = store().project!.pages[0].elements;
    expect(elements).toHaveLength(2);
    expect(elements[1].id).not.toBe("s");
    expect(elements[1].x).toBe(34);
  });

  it("does not nudge locked elements", () => {
    store().addElement(createShapeElement("rectangle", { id: "l", locked: true }));
    store().nudge(["l"], 10, 0);
    expect(store().project!.pages[0].elements[0].x).toBe(0);
  });
});
