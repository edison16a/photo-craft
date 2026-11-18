/**
 * Which copy of a keyed picture a render asks for. Konva, fonts and the
 * image cache stand in, since jsdom cannot draw.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createImageElement } from "../../model/element-factories";
import { createProject } from "../../model/project-factories";
import { filteredImage } from "../konva/filtered-image";
import { renderPageToCanvas } from "./render-page";
import { renderThumbnail } from "./thumbnail";

vi.mock("../konva/filtered-image", () => ({ filteredImage: vi.fn((image: HTMLImageElement) => image) }));
vi.mock("../font-loader", () => ({ ensureFontsLoaded: async () => undefined }));
vi.mock("../image-cache", () => ({ getCachedImage: async () => new Image() }));
vi.mock("konva", () => {
  class Node {
    add() {}
  }
  class Stage extends Node {
    toCanvas({ width, height, pixelRatio }: { width: number; height: number; pixelRatio: number }) {
      return { width: Math.round(width * pixelRatio), height: Math.round(height * pixelRatio), toDataURL: () => "data:," };
    }
    destroy() {}
  }
  return { default: { Stage, Layer: Node, Group: Node, Image: Node, Rect: Node } };
});

const project = createProject("Test", 1000, 800);
const page = project.pages[0];
page.elements.push(createImageElement("data:image/png;base64,AAAA", 400, 300, { chromaKey: { color: "#00ff00", tolerance: 30, softness: 10 } }));

const draftAsked = () => vi.mocked(filteredImage).mock.calls.map((call) => call[2]?.draft);

beforeEach(() => vi.mocked(filteredImage).mockClear());

describe("render page", () => {
  it("uses full size pictures unless told otherwise", async () => {
    await renderPageToCanvas(project, page, { pixelRatio: 1, transparent: false });
    expect(draftAsked()).toEqual([false]);
  });

  it("lets thumbnails use the small copy", async () => {
    await renderThumbnail(project, page);
    expect(draftAsked()).toEqual([true]);
  });
});
