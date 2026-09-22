import { describe, expect, it } from "vitest";
import {
  createImageElement,
  createShapeElement,
  createTextElement,
} from "../model/element-factories";
import { createPage, createProject } from "../model/project-factories";
import type { CanvasElement, Project } from "../model/types";
import { collectElementColors, collectImageSources } from "./project-colors";

/** A one page project holding the given elements on a white page. */
function projectWith(...elements: CanvasElement[]): Project {
  const project = createProject("Test", 800, 600);
  project.pages[0].elements = elements;
  return project;
}

const PNG = "data:image/png;base64,AAAA";
const JPG = "data:image/jpeg;base64,BBBB";

describe("collectElementColors", () => {
  it("lists colours in order of first use, background first", () => {
    const project = projectWith(
      createTextElement({ fill: "#111214" }),
      createShapeElement("rectangle", { fill: "#4da3ff" }),
      createShapeElement("line", { stroke: "#ff0000", strokeWidth: 4 }),
    );
    expect(collectElementColors(project)).toEqual(["#ffffff", "#111214", "#4da3ff", "#ff0000"]);
  });

  it("removes duplicates across elements and pages", () => {
    const project = projectWith(
      createShapeElement("rectangle", { fill: "#4da3ff" }),
      createShapeElement("ellipse", { fill: "#4da3ff" }),
      createTextElement({ fill: "#ffffff" }),
    );
    const second = createPage("Page 2");
    second.background = "#4da3ff";
    second.elements = [createTextElement({ fill: "#00ff00" })];
    project.pages.push(second);
    expect(collectElementColors(project)).toEqual(["#ffffff", "#4da3ff", "#00ff00"]);
  });

  it("skips transparent and other non hex values", () => {
    const project = projectWith(
      createShapeElement("line", { fill: "transparent", stroke: "#123456", strokeWidth: 2 }),
      createShapeElement("rectangle", { fill: "rgb(1, 2, 3)", stroke: "transparent", strokeWidth: 3 }),
    );
    project.pages[0].background = "transparent";
    expect(collectElementColors(project)).toEqual(["#123456"]);
  });

  it("ignores a stroke whose width is zero", () => {
    const hidden = createShapeElement("rectangle", { fill: "#101010", stroke: "#ff0000", strokeWidth: 0 });
    const shown = createShapeElement("rectangle", { fill: "#202020", stroke: "#00ff00", strokeWidth: 1 });
    expect(collectElementColors(projectWith(hidden, shown))).toEqual([
      "#ffffff",
      "#101010",
      "#202020",
      "#00ff00",
    ]);
  });

  it("normalises uppercase and short hex values", () => {
    const project = projectWith(
      createTextElement({ fill: "#ABCDEF" }),
      createShapeElement("rectangle", { fill: "#FFF" }),
      createShapeElement("ellipse", { fill: "#abcdef" }),
    );
    expect(collectElementColors(project)).toEqual(["#ffffff", "#abcdef"]);
  });

  it("gives an empty list for a project with no pages", () => {
    const project = createProject("Empty", 10, 10);
    project.pages = [];
    expect(collectElementColors(project)).toEqual([]);
  });
});

describe("collectImageSources", () => {
  it("returns each distinct source once, in order of first use", () => {
    const project = projectWith(
      createTextElement(),
      createImageElement(PNG, 10, 10),
      createImageElement(JPG, 20, 20),
      createImageElement(PNG, 10, 10),
    );
    const second = createPage("Page 2");
    second.elements = [createImageElement(JPG, 20, 20)];
    project.pages.push(second);
    expect(collectImageSources(project)).toEqual([PNG, JPG]);
  });

  it("gives an empty list when there are no images", () => {
    const project = projectWith(createShapeElement("star"));
    expect(collectImageSources(project)).toEqual([]);
  });
});
