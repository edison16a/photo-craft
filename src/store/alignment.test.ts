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

describe("alignElements with groups", () => {
  const member = (id: string, x: number, y: number, locked = false) =>
    createShapeElement("rectangle", { id, x, y, width: 100, height: 100, groupId: "g", locked });

  it("aligns one group to the page as a whole", () => {
    const [a, b] = alignElements([member("a", 100, 0), member("b", 300, 50)], ["a", "b"], "right", page);
    expect(a.x).toBe(700);
    expect(b.x).toBe(900);
    expect(b.y).toBe(50);
  });

  it("aligns the group's bounds with other units", () => {
    const other = createShapeElement("rectangle", { id: "c", x: 50, y: 0, width: 10, height: 10 });
    const [a, b, c] = alignElements([member("a", 100, 0), member("b", 300, 0), other], ["a", "b", "c"], "left", page);
    expect([a.x, b.x, c.x]).toEqual([50, 250, 50]);
  });

  it("keeps a group with a locked member in place", () => {
    const elements = [member("a", 100, 0), member("b", 300, 0, true)];
    expect(alignElements(elements, ["a", "b"], "left", page)).toBe(elements);
  });
});
