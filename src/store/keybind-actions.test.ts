import { beforeEach, describe, expect, it, vi } from "vitest";
import { createImageElement } from "../model/element-factories";
import { createProject } from "../model/project-factories";
import { selectedImage } from "./background-actions";
import { useEditorUiStore } from "./editor-ui-store";
import { runKeybindAction } from "./keybind-actions";
import { useProjectStore } from "./project-store";

vi.mock("../services/background-removal", () => ({
  isBackgroundRemovalSupported: () => true,
  removeBackgroundFromDataUrl: vi.fn(),
}));

describe("keybind actions", () => {
  beforeEach(() => {
    useEditorUiStore.getState().setTool("select");
    useProjectStore.getState().loadProject(createProject("Test", 400, 300));
  });

  it("picks the tool a key is bound to", () => {
    runKeybindAction("draw");
    expect(useEditorUiStore.getState().tool).toBe("draw");
    runKeybindAction("upload");
    expect(useEditorUiStore.getState().tool).toBe("upload");
  });

  it("only sees an image when exactly one is selected", () => {
    const store = useProjectStore.getState();
    const image = createImageElement("data:image/png;base64,AAAA", 10, 10);
    store.addElement(image);
    expect(selectedImage()?.id).toBe(image.id);
    store.clearSelection();
    expect(selectedImage()).toBeNull();
    expect(() => runKeybindAction("removeBackground")).not.toThrow();
    expect(useEditorUiStore.getState().busyImageIds).toEqual([]);
  });
});
