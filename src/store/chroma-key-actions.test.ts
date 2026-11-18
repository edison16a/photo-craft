/**
 * Pick mode with the real stores. jsdom cannot decode or read pictures,
 * so the image cache and the pixel sampler stand in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SOFTNESS, DEFAULT_TOLERANCE } from "../lib/chroma-key";
import { sampleImageAt } from "../lib/pixel-sample";
import { createImageElement, createShapeElement } from "../model/element-factories";
import { createProject } from "../model/project-factories";
import type { ImageElement } from "../model/types";
import { applyPickedColor, pickColorAt, toggleColorPick, watchPickTarget } from "./chroma-key-actions";
import { useEditorUiStore } from "./editor-ui-store";
import { useProjectStore } from "./project-store";

vi.mock("../lib/image-cache", () => ({ peekCachedImage: () => new Image(), getCachedImage: vi.fn() }));
vi.mock("../lib/pixel-sample", () => ({ sampleImageAt: vi.fn() }));

const store = () => useProjectStore.getState();
const ui = () => useEditorUiStore.getState();
const image = () => store().project?.pages[0].elements.find((el) => el.id === "img") as ImageElement;

let unwatch: () => void = () => undefined;

beforeEach(() => {
  vi.mocked(sampleImageAt).mockReset();
  ui().setTool("select");
  store().loadProject(createProject("Test", 400, 300));
  store().addElement(createImageElement("data:image/png;base64,AAAA", 100, 80, { id: "img" }));
  unwatch = watchPickTarget();
});

afterEach(() => unwatch());

describe("chroma key actions", () => {
  it("starts picking on an image, selecting it, and stops when asked again", () => {
    store().clearSelection();
    toggleColorPick("img");
    expect(ui().pickingColorFor).toBe("img");
    expect(store().selectedIds).toEqual(["img"]);
    toggleColorPick("img");
    expect(ui().pickingColorFor).toBeNull();
  });

  it("ignores ids that are not images", () => {
    store().addElement(createShapeElement("rectangle", { id: "box" }));
    toggleColorPick("box");
    toggleColorPick("missing");
    expect(ui().pickingColorFor).toBeNull();
  });

  it("stops picking when the tool changes or something else is selected", () => {
    toggleColorPick("img");
    ui().setTool("text");
    expect(ui().pickingColorFor).toBeNull();
    ui().setTool("select");
    toggleColorPick("img");
    store().addElement(createShapeElement("rectangle", { id: "box" }));
    expect(ui().pickingColorFor).toBeNull();
    toggleColorPick("img");
    store().removeElements(["img"]);
    expect(ui().pickingColorFor).toBeNull();
  });

  it("keys the picked colour in one undo step and ends pick mode", () => {
    vi.mocked(sampleImageAt).mockReturnValue({ color: "#00b140", alpha: 255 });
    toggleColorPick("img");
    const before = store().history.past.length;
    pickColorAt({ x: 10, y: 10 });
    expect(image().chromaKey).toEqual({ color: "#00b140", tolerance: DEFAULT_TOLERANCE, softness: DEFAULT_SOFTNESS });
    expect(store().history.past.length - before).toBe(1);
    expect(ui().pickingColorFor).toBeNull();
    store().undo();
    expect(image().chromaKey).toBeUndefined();
  });

  it("keeps the tolerance and softness already set", () => {
    store().updateElement("img", { chromaKey: { color: "#ffffff", tolerance: 60, softness: 3 } });
    applyPickedColor("img", "#123456");
    expect(image().chromaKey).toEqual({ color: "#123456", tolerance: 60, softness: 3 });
  });

  it("changes nothing for a click off the picture or on a see through pixel", () => {
    const before = store().history.past.length;
    vi.mocked(sampleImageAt).mockReturnValueOnce(null).mockReturnValueOnce({ color: "#000000", alpha: 0 });
    toggleColorPick("img");
    pickColorAt({ x: -5, y: -5 });
    expect(ui().pickingColorFor).toBeNull();
    toggleColorPick("img");
    pickColorAt({ x: 5, y: 5 });
    expect(image().chromaKey).toBeUndefined();
    expect(store().history.past.length).toBe(before);
  });

  it("does nothing when not picking", () => {
    pickColorAt({ x: 10, y: 10 });
    expect(sampleImageAt).not.toHaveBeenCalled();
  });
});
