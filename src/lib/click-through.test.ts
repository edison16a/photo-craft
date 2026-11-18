/**
 * Click through on hand made hit lists: the units under the pointer from
 * the top down, and the one a click steps to next.
 */
import { describe, expect, it } from "vitest";
import { createShapeElement } from "../model/element-factories";
import type { CanvasElement } from "../model/types";
import { nextUnitUnder, unitsUnder } from "./click-through";

function box(id: string, extra: Partial<CanvasElement> = {}): CanvasElement {
  return createShapeElement("rectangle", { id, width: 100, height: 100, ...extra });
}

describe("unitsUnder", () => {
  it("lists hit units from the top down and collapses groups", () => {
    const elements = [
      box("bottom"),
      box("g1", { groupId: "g" }),
      box("middle"),
      box("g2", { groupId: "g" }),
      box("top"),
      box("away"),
    ];
    const hits = ["g1", "bottom", "top", "middle"];
    expect(unitsUnder(elements, hits)).toEqual([["top"], ["middle"], ["g1", "g2"], ["bottom"]]);
  });

  it("places a group at its highest member that is hit", () => {
    const elements = [box("g1", { groupId: "g" }), box("middle"), box("g2", { groupId: "g" })];
    expect(unitsUnder(elements, ["g1", "middle"])).toEqual([["middle"], ["g1", "g2"]]);
    expect(unitsUnder(elements, ["g2", "middle"])).toEqual([["g1", "g2"], ["middle"]]);
  });

  it("leaves out elements that are not hit, whatever their box covers", () => {
    // Same box, but only the rectangle is drawn at a corner the ellipse misses.
    const elements = [box("rect"), createShapeElement("ellipse", { id: "ellipse", width: 100, height: 100 })];
    expect(unitsUnder(elements, ["rect"])).toEqual([["rect"]]);
  });

  it("counts the clicked element even when it is not among the hits", () => {
    expect(unitsUnder([box("a"), box("b")], ["a"], "b")).toEqual([["b"], ["a"]]);
  });
});

describe("nextUnitUnder", () => {
  const elements = [box("image"), box("lower"), box("upper")];
  const all = ["image", "lower", "upper"];

  it("goes down the stacking order", () => {
    expect(nextUnitUnder(elements, "upper", all)).toEqual(["lower"]);
    expect(nextUnitUnder(elements, "lower", all)).toEqual(["image"]);
  });

  it("wraps from the bottom back to the top", () => {
    expect(nextUnitUnder(elements, "image", all)).toEqual(["upper"]);
  });

  it("never wraps to an element in front that is not hit", () => {
    expect(nextUnitUnder(elements, "lower", ["image", "lower"])).toEqual(["image"]);
    expect(nextUnitUnder(elements, "image", ["image", "lower"])).toEqual(["lower"]);
  });

  it("steps past a whole group at once", () => {
    const grouped = [box("image"), box("a", { groupId: "g" }), box("b", { groupId: "g" })];
    expect(nextUnitUnder(grouped, "b", ["image", "a", "b"])).toEqual(["image"]);
    expect(nextUnitUnder(grouped, "image", ["image", "a", "b"])).toEqual(["a", "b"]);
  });

  it("changes nothing when only one unit is hit", () => {
    expect(nextUnitUnder(elements, "image", ["image"])).toBeNull();
    const pair = [box("a", { groupId: "g" }), box("b", { groupId: "g" })];
    expect(nextUnitUnder(pair, "a", ["a", "b"])).toBeNull();
  });
});
