import { describe, expect, it } from "vitest";
import { createImageElement, createShapeElement } from "../model/element-factories";
import { keepsRatio } from "./keeps-ratio";

describe("keepsRatio", () => {
  it("keeps proportions for images and drawn shapes by default", () => {
    expect(keepsRatio(createImageElement("data:,", 10, 10))).toBe(true);
    expect(keepsRatio(createShapeElement("custom", { points: [0, 0, 1, 0, 1, 1] }))).toBe(true);
    expect(keepsRatio(createShapeElement("star"))).toBe(false);
  });

  it("follows the switch when it is set", () => {
    expect(keepsRatio(createImageElement("data:,", 10, 10, { lockRatio: false }))).toBe(false);
    expect(keepsRatio(createShapeElement("star", { lockRatio: true }))).toBe(true);
  });
});
