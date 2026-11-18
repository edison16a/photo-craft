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
import {
  applyPickedColor,
  inPickDoubleClick,
  pickColorAt,
  sampleForPick,
  toggleColorPick,
  watchPickTarget,
} from "./chroma-key-actions";
import { useEditorUiStore } from "./editor-ui-store";
import { clickElement, DOUBLE_CLICK_MS, pressElement, resetElementClicks } from "./element-clicks";
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

afterEach(() => {
  unwatch();
  vi.useRealTimers();
});

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
    pickColorAt({ x: 300, y: 200 });
    expect(ui().pickingColorFor).toBeNull();
    toggleColorPick("img");
    pickColorAt({ x: 5, y: 5 });
    expect(image().chromaKey).toBeUndefined();
    expect(store().history.past.length).toBe(before);
  });

  it("treats points off the page as a miss, where the picture is clipped away", () => {
    vi.mocked(sampleImageAt).mockReturnValue({ color: "#00b140", alpha: 255 });
    store().updateElement("img", { x: -100, y: -100, width: 600, height: 500 });
    for (const point of [{ x: -1, y: 10 }, { x: 10, y: -1 }, { x: 400, y: 10 }, { x: 10, y: 300 }]) {
      expect(sampleForPick(store(), "img", point)).toBeNull();
      toggleColorPick("img");
      pickColorAt(point);
      expect(ui().pickingColorFor).toBeNull();
    }
    expect(sampleImageAt).not.toHaveBeenCalled();
    expect(image().chromaKey).toBeUndefined();
    expect(sampleForPick(store(), "img", { x: 0, y: 0 })).toEqual({ color: "#00b140", alpha: 255 });
  });

  it("counts the pick as the first click of a double click, so the second does not step", () => {
    vi.useFakeTimers();
    resetElementClicks();
    vi.mocked(sampleImageAt).mockReturnValue({ color: "#00b140", alpha: 255 });
    store().loadProject(createProject("Test", 400, 300));
    const src = "data:image/png;base64,AAAA";
    store().addElements([createShapeElement("rectangle", { id: "box" }), createImageElement(src, 100, 80, { id: "img" })], false);
    const input = { id: "img", point: { x: 20, y: 20 }, under: () => ["box", "img"], button: 0, shift: false, mod: false };
    toggleColorPick("img");
    pickColorAt(input.point);
    expect(inPickDoubleClick()).toBe(true);
    vi.advanceTimersByTime(100);
    pressElement(input);
    clickElement(input);
    expect(store().selectedIds).toEqual(["img"]);
    vi.advanceTimersByTime(DOUBLE_CLICK_MS);
    expect(inPickDoubleClick()).toBe(false);
    pressElement(input);
    clickElement(input);
    expect(store().selectedIds).toEqual(["box"]);
  });

  it("does nothing when not picking", () => {
    pickColorAt({ x: 10, y: 10 });
    expect(sampleImageAt).not.toHaveBeenCalled();
  });
});
