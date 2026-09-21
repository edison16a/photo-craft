import { describe, expect, it } from "vitest";
import { createShapeElement } from "../model/element-factories";
import { alignElements } from "./alignment";

const page = { width: 1000, height: 500 };

describe("alignElements", () => {
  it("aligns a single element to the page centre", () => {
    const el = createShapeElement("rectangle", { id: "a", x: 10, y: 10, width: 100, height: 50 });
    const [aligned] = alignElements([el], ["a"], "centerX", page);
    expect(aligned.x).toBe(450);
    expect(aligned.y).toBe(10);
  });

  it("aligns several elements to the selection box", () => {
    const a = createShapeElement("rectangle", { id: "a", x: 100, y: 0, width: 100, height: 50 });
    const b = createShapeElement("rectangle", { id: "b", x: 300, y: 0, width: 50, height: 50 });
    const [na, nb] = alignElements([a, b], ["a", "b"], "right", page);
    expect(na.x).toBe(250);
    expect(nb.x).toBe(300);
  });

  it("leaves locked elements in place", () => {
    const el = createShapeElement("rectangle", { id: "a", x: 10, y: 10, locked: true });
    const [aligned] = alignElements([el], ["a"], "bottom", page);
    expect(aligned).toBe(el);
  });
});
