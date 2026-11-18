import { describe, expect, it } from "vitest";
import { createShapeElement } from "../model/element-factories";
import type { CanvasElement } from "../model/types";
import { restack } from "./stack-order";

/** Builds a stack from a pattern such as "a b:G c:G", where :G is a groupId. */
function stack(pattern: string): CanvasElement[] {
  return pattern.split(" ").map((token) => {
    const [id, groupId] = token.split(":");
    return createShapeElement("rectangle", groupId ? { id, groupId } : { id });
  });
}

const order = (elements: CanvasElement[]) => elements.map((element) => element.id).join(" ");

describe("restack with lone elements", () => {
  it("steps one place past the nearest unselected neighbour", () => {
    const elements = stack("a b c d e");
    expect(order(restack(elements, ["b", "c"], "forward"))).toBe("a d b c e");
    expect(order(restack(elements, ["c", "d"], "backward"))).toBe("a c d b e");
  });

  it("moves to the top or bottom keeping the moving order", () => {
    const elements = stack("a b c d");
    expect(order(restack(elements, ["a", "c"], "front"))).toBe("b d a c");
    expect(order(restack(elements, ["b", "d"], "back"))).toBe("b d a c");
  });

  it("hands back the same list when nothing can move", () => {
    const elements = stack("a b c");
    expect(restack(elements, ["c"], "forward")).toBe(elements);
    expect(restack(elements, ["a"], "backward")).toBe(elements);
    expect(restack(elements, ["zzz"], "front")).toBe(elements);
  });
});

describe("restack with groups", () => {
  it("steps a lone element past a whole group, not into it", () => {
    const elements = stack("a b:G c:G d e");
    expect(order(restack(elements, ["a"], "forward"))).toBe("b c a d e");
    expect(order(restack(elements, ["d"], "backward"))).toBe("a d b c e");
  });

  it("steps a group past a whole neighbouring group", () => {
    const elements = stack("a:AB b:AB c:CD d:CD e");
    expect(order(restack(elements, ["a", "b"], "forward"))).toBe("c d a b e");
    expect(order(restack(elements, ["c", "d"], "backward"))).toBe("c d a b e");
  });

  it("keeps every group in one block after any move", () => {
    const elements = stack("a:AB b:AB c d:DE e:DE f");
    for (const direction of ["forward", "backward", "front", "back"] as const) {
      for (const ids of [["a", "b"], ["c"], ["d", "e"], ["f"], ["c", "f"]]) {
        const keys = restack(elements, ids, direction).map((element) => element.groupId ?? element.id);
        const runs = keys.filter((key, index) => key !== keys[index - 1]);
        expect(new Set(runs).size).toBe(runs.length);
      }
    }
  });

  it("moves a member picked out of a group only among its own members", () => {
    const elements = stack("a b:G c:G d:G e");
    expect(order(restack(elements, ["c"], "forward"))).toBe("a b d c e");
    expect(order(restack(elements, ["c"], "backward"))).toBe("a c b d e");
    expect(order(restack(elements, ["b"], "front"))).toBe("a c d b e");
    expect(order(restack(elements, ["d"], "back"))).toBe("a d b c e");
  });

  it("does not let a member leave its group at the group's edge", () => {
    const elements = stack("a b:G c:G e");
    expect(restack(elements, ["c"], "forward")).toBe(elements);
    expect(restack(elements, ["b"], "backward")).toBe(elements);
    expect(restack(elements, ["c"], "front")).toBe(elements);
  });

  it("moves a picked out member and a whole unit at their own levels", () => {
    const elements = stack("x b:G c:G d:G");
    expect(order(restack(elements, ["x", "c"], "forward"))).toBe("b d c x");
  });

  it("joins the parts of a group that an older save left apart when they pass each other", () => {
    const elements = stack("b:G a c:G");
    expect(order(restack(elements, ["a"], "forward"))).toBe("b c a");
  });
});
