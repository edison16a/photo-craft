import { describe, expect, it } from "vitest";
import { createShapeElement } from "../model/element-factories";
import type { CanvasElement } from "../model/types";
import { boxContainsPoint, nextUnitUnder, unitsUnderPoint } from "./click-through";

function box(id: string, x: number, y: number, extra: Partial<CanvasElement> = {}): CanvasElement {
  return createShapeElement("rectangle", { id, x, y, width: 100, height: 100, ...extra });
}

describe("boxContainsPoint", () => {
  const bar = box("bar", 0, 90, { width: 200, height: 20 });

  it("checks the upright box, edges included", () => {
    expect(boxContainsPoint(bar, { x: 150, y: 100 })).toBe(true);
    expect(boxContainsPoint(bar, { x: 200, y: 110 })).toBe(true);
    expect(boxContainsPoint(bar, { x: 100, y: 130 })).toBe(false);
  });

  it("turns the box about its centre", () => {
    // Turned a quarter, the bar stands upright through its centre (100, 100).
    const turned = { ...bar, rotation: 90 };
    expect(boxContainsPoint(turned, { x: 100, y: 190 })).toBe(true);
    expect(boxContainsPoint(turned, { x: 190, y: 100 })).toBe(false);
    const diagonal = { ...bar, rotation: 45 };
    expect(boxContainsPoint(diagonal, { x: 160, y: 160 })).toBe(true);
    expect(boxContainsPoint(diagonal, { x: 160, y: 40 })).toBe(false);
  });
});

describe("unitsUnderPoint", () => {
  it("lists units from the top down and collapses groups", () => {
    const elements = [
      box("bottom", 0, 0),
      box("g1", 50, 50, { groupId: "g" }),
      box("middle", 0, 0),
      box("g2", 500, 500, { groupId: "g" }),
      box("top", 0, 0),
      box("away", 300, 300),
    ];
    expect(unitsUnderPoint(elements, { x: 60, y: 60 })).toEqual([["top"], ["middle"], ["g1", "g2"], ["bottom"]]);
  });

  it("counts the clicked element even when its box misses", () => {
    expect(unitsUnderPoint([box("a", 0, 0), box("b", 200, 0)], { x: 50, y: 50 }, "b")).toEqual([["b"], ["a"]]);
  });
});

describe("nextUnitUnder", () => {
  const elements = [box("image", 0, 0), box("lower", 20, 20), box("upper", 40, 40)];
  const point = { x: 60, y: 60 };

  it("goes down the stacking order", () => {
    expect(nextUnitUnder(elements, "upper", point)).toEqual(["lower"]);
    expect(nextUnitUnder(elements, "lower", point)).toEqual(["image"]);
  });

  it("wraps from the bottom back to the top", () => {
    expect(nextUnitUnder(elements, "image", point)).toEqual(["upper"]);
  });

  it("steps past a whole group at once", () => {
    const grouped = [box("image", 0, 0), box("a", 20, 20, { groupId: "g" }), box("b", 40, 40, { groupId: "g" })];
    expect(nextUnitUnder(grouped, "b", point)).toEqual(["image"]);
    expect(nextUnitUnder(grouped, "image", point)).toEqual(["a", "b"]);
  });

  it("changes nothing when only one unit is under the point", () => {
    expect(nextUnitUnder(elements, "image", { x: 5, y: 5 })).toBeNull();
    const pair = [box("a", 0, 0, { groupId: "g" }), box("b", 10, 10, { groupId: "g" })];
    expect(nextUnitUnder(pair, "a", { x: 50, y: 50 })).toBeNull();
  });
});
