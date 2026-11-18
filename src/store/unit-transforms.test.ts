import { describe, expect, it } from "vitest";
import { createShapeElement } from "../model/element-factories";
import type { CanvasElement } from "../model/types";
import { flipUnits, rotateUnitsQuarter } from "./unit-transforms";

function box(id: string, x: number, y: number, extra: Partial<CanvasElement> = {}): CanvasElement {
  return createShapeElement("rectangle", { id, x, y, width: 100, height: 50, ...extra });
}

describe("flipUnits", () => {
  it("flips a lone element in place", () => {
    const [flipped] = flipUnits([box("a", 10, 10)], ["a"], "x");
    expect(flipped).toMatchObject({ x: 10, y: 10, flipX: true });
  });

  it("mirrors a group about its bounds centre", () => {
    // Bounds run from x 0 to 400, so the centre line is at 200.
    const elements = [box("a", 0, 0, { groupId: "g" }), box("b", 300, 100, { groupId: "g" })];
    const [a, b] = flipUnits(elements, ["a", "b"], "x");
    expect(a).toMatchObject({ x: 300, y: 0, flipX: true });
    expect(b).toMatchObject({ x: 0, y: 100, flipX: true });
  });

  it("negates the rotation of mirrored members", () => {
    const elements = [box("a", 0, 0, { groupId: "g", rotation: 30 }), box("b", 300, 0, { groupId: "g", rotation: 30 })];
    const [a, b] = flipUnits(elements, ["a", "b"], "x");
    expect([a.rotation, b.rotation]).toEqual([330, 330]);
    expect([a.x, b.x]).toEqual([300, 0]);
  });

  it("mirrors a group vertically", () => {
    const elements = [box("a", 0, 0, { groupId: "g" }), box("b", 0, 150, { groupId: "g" })];
    const [a, b] = flipUnits(elements, ["a", "b"], "y");
    expect([a.y, b.y]).toEqual([150, 0]);
    expect(a.flipY && b.flipY).toBe(true);
  });

  it("leaves a group with a locked member alone", () => {
    const elements = [box("a", 0, 0, { groupId: "g" }), box("b", 300, 0, { groupId: "g", locked: true })];
    expect(flipUnits(elements, ["a", "b"], "x")).toBe(elements);
  });
});

describe("rotateUnitsQuarter", () => {
  it("turns a lone element in place", () => {
    const [turned] = rotateUnitsQuarter([box("a", 10, 10, { rotation: 300 })], ["a"]);
    expect(turned).toMatchObject({ x: 10, y: 10, rotation: 30 });
  });

  it("swings group members round the group centre", () => {
    // Centres at (50, 25) and (250, 25); the group centre is (150, 25).
    const elements = [box("a", 0, 0, { groupId: "g" }), box("b", 200, 0, { groupId: "g" })];
    const [a, b] = rotateUnitsQuarter(elements, ["a", "b"]);
    expect(a.rotation).toBe(90);
    expect({ x: a.x + 50, y: a.y + 25 }).toEqual({ x: 150, y: -75 });
    expect({ x: b.x + 50, y: b.y + 25 }).toEqual({ x: 150, y: 125 });
  });

  it("does not turn locked elements", () => {
    const elements = [box("a", 0, 0, { locked: true })];
    expect(rotateUnitsQuarter(elements, ["a"])).toBe(elements);
  });
});
