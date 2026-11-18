/**
 * Drives the autosave hook with fake timers and a fake save, to check
 * when it writes and that it never writes a value still being previewed.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createShapeElement } from "@/model/element-factories";
import { createProject } from "@/model/project-factories";
import { useProjectStore } from "@/store/project-store";
import { AUTOSAVE_DELAY_MS, useAutosave } from "./use-autosave";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const store = () => useProjectStore.getState();
const save = vi.fn(async () => true);

function Autosave() {
  useAutosave(true, save);
  return null;
}

let root: Root;

beforeEach(async () => {
  vi.useFakeTimers();
  save.mockClear();
  store().loadProject(createProject("Test", 400, 300));
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(createElement(Autosave)));
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
});

const wait = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

describe("autosave", () => {
  it("saves a moment after the last change", async () => {
    store().addElement(createShapeElement("rectangle", { id: "box" }));
    await wait(AUTOSAVE_DELAY_MS - 1);
    expect(save).not.toHaveBeenCalled();
    await wait(1);
    expect(save).toHaveBeenCalledWith(true);
  });

  it("waits while a change is previewed and saves once it ends", async () => {
    store().addElement(createShapeElement("rectangle", { id: "box" }));
    store().beginPreview();
    store().previewElements(["box"], { x: 40 });
    await wait(AUTOSAVE_DELAY_MS * 4);
    expect(save).not.toHaveBeenCalled();
    store().endPreview();
    await wait(AUTOSAVE_DELAY_MS);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("still saves when a preview ends without a change", async () => {
    store().addElement(createShapeElement("rectangle", { id: "box" }));
    store().beginPreview();
    await wait(AUTOSAVE_DELAY_MS * 2);
    expect(save).not.toHaveBeenCalled();
    store().endPreview();
    await wait(AUTOSAVE_DELAY_MS);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
