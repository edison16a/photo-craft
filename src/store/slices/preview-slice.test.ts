import { beforeEach, describe, expect, it } from "vitest";
import { createShapeElement } from "../../model/element-factories";
import { createProject } from "../../model/project-factories";
import { useProjectStore } from "../project-store";

const store = () => useProjectStore.getState();

describe("preview slice", () => {
  beforeEach(() => {
    store().loadProject(createProject("Test", 800, 600));
    store().addElement(createShapeElement("rectangle", { id: "a", x: 0 }));
    store().markSaved(store().project!);
  });

  it("records many previews as one undo step", () => {
    const stepsBefore = store().history.past.length;
    store().beginPreview();
    store().previewElements(["a"], { x: 10 });
    store().previewElements(["a"], { x: 20 });
    store().previewElements(["a"], { x: 30 });
    expect(store().history.past.length).toBe(stepsBefore);
    expect(store().dirty).toBe(false);
    store().endPreview();
    expect(store().history.past.length).toBe(stepsBefore + 1);
    expect(store().dirty).toBe(true);
    expect(store().project!.pages[0].elements[0].x).toBe(30);
    store().undo();
    expect(store().project!.pages[0].elements[0].x).toBe(0);
  });

  it("records nothing when the preview changed nothing", () => {
    const stepsBefore = store().history.past.length;
    store().beginPreview();
    store().previewElements(["a"], { x: 0 });
    store().endPreview();
    expect(store().history.past.length).toBe(stepsBefore);
    expect(store().dirty).toBe(false);
  });

  it("ignores endPreview without a begin and nested begins", () => {
    store().endPreview();
    store().beginPreview();
    store().previewElements(["a"], { x: 5 });
    store().beginPreview();
    store().previewElements(["a"], { x: 9 });
    store().endPreview();
    store().undo();
    expect(store().project!.pages[0].elements[0].x).toBe(0);
  });
});
