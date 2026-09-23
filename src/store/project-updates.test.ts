import { describe, expect, it } from "vitest";
import { createImageElement, createShapeElement } from "../model/element-factories";
import { createProject } from "../model/project-factories";
import {
  addElementsToPage,
  movePage,
  patchElement,
  removeElementsFromPage,
  reorderElements,
  sameValue,
  withElements,
} from "./project-updates";

function projectWithShapes(count: number) {
  const project = createProject("Test", 100, 100);
  const elements = Array.from({ length: count }, (_, i) =>
    createShapeElement("rectangle", { id: `e${i}`, x: i * 10 }),
  );
  return addElementsToPage(project, project.pages[0].id, elements);
}

describe("project updates", () => {
  it("adds elements without touching other pages", () => {
    const project = projectWithShapes(2);
    expect(project.pages[0].elements.map((e) => e.id)).toEqual(["e0", "e1"]);
  });

  it("keeps untouched elements identical after a patch", () => {
    const project = projectWithShapes(3);
    const pageId = project.pages[0].id;
    const next = withElements(project, pageId, ["e1"], (e) => ({ ...e, x: 99 }));
    expect(next.pages[0].elements[0]).toBe(project.pages[0].elements[0]);
    expect(next.pages[0].elements[1].x).toBe(99);
  });

  it("removes elements", () => {
    const project = projectWithShapes(3);
    const next = removeElementsFromPage(project, project.pages[0].id, ["e0", "e2"]);
    expect(next.pages[0].elements.map((e) => e.id)).toEqual(["e1"]);
  });

  it("brings an element forward one step past an unselected neighbour", () => {
    const project = projectWithShapes(3);
    const next = reorderElements(project, project.pages[0].id, ["e0"], "forward");
    expect(next.pages[0].elements.map((e) => e.id)).toEqual(["e1", "e0", "e2"]);
  });

  it("sends a group to the back keeping its order", () => {
    const project = projectWithShapes(4);
    const next = reorderElements(project, project.pages[0].id, ["e2", "e3"], "back");
    expect(next.pages[0].elements.map((e) => e.id)).toEqual(["e2", "e3", "e0", "e1"]);
  });

  it("moves a page and refuses to move past the ends", () => {
    const project = createProject("Test", 10, 10);
    const two = { ...project, pages: [project.pages[0], { ...project.pages[0], id: "p2", name: "Page 2" }] };
    expect(movePage(two, "p2", -1).pages[0].id).toBe("p2");
    expect(movePage(two, "p2", 1)).toBe(two);
  });

  it("treats a fresh copy of an object field with the same values as no change", () => {
    const image = createImageElement("data:image/png;base64,AAAA", 10, 10, { adjust: { brightness: 0, contrast: 0, saturation: 50, hue: 0 } });
    expect(patchElement(image, { adjust: { brightness: 0, contrast: 0, saturation: 50, hue: 0 } })).toBe(image);
    expect(patchElement(image, { adjust: { brightness: 1, contrast: 0, saturation: 50, hue: 0 } })).not.toBe(image);
    expect(patchElement(image, { adjust: undefined })).not.toBe(image);
    expect(sameValue(undefined, undefined)).toBe(true);
    expect(sameValue({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameValue([1], [1])).toBe(false);
  });
});
