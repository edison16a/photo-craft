import { describe, expect, it } from "vitest";
import { createShapeElement } from "../model/element-factories";
import type { CanvasElement } from "../model/types";
import {
  expandToGroups,
  freshGroupIds,
  groupAction,
  groupInStack,
  isFrozenUnit,
  normaliseGroups,
  splitByLock,
  splitIntoUnits,
  toggleUnitSelection,
  ungroupInStack,
} from "./groups";

function shape(id: string, groupId?: string): CanvasElement {
  return createShapeElement("rectangle", groupId ? { id, groupId } : { id });
}

const ids = (elements: CanvasElement[]) => elements.map((element) => element.id);
const groupIds = (elements: CanvasElement[]) => elements.map((element) => element.groupId);

describe("expandToGroups", () => {
  it("adds the other members of each group, in stacking order", () => {
    const elements = [shape("a", "g"), shape("b"), shape("c", "g"), shape("d", "h"), shape("e", "h")];
    expect(expandToGroups(elements, ["c"])).toEqual(["a", "c"]);
    expect(expandToGroups(elements, ["b", "e"])).toEqual(["b", "d", "e"]);
  });

  it("drops ids that are not on the page", () => {
    expect(expandToGroups([shape("a")], ["a", "zzz"])).toEqual(["a"]);
  });
});

describe("splitIntoUnits", () => {
  it("keeps a group together and lone elements apart", () => {
    const units = splitIntoUnits([shape("a", "g"), shape("b"), shape("c", "g"), shape("d")]);
    expect(units.map(ids)).toEqual([["a", "c"], ["b"], ["d"]]);
  });

  it("treats a group with one member given as a unit of one", () => {
    expect(splitIntoUnits([shape("a", "g")]).map(ids)).toEqual([["a"]]);
  });
});

describe("splitByLock", () => {
  const locked = (id: string, groupId?: string) => ({ ...shape(id, groupId), locked: true });

  it("holds every given member of a unit with a locked member", () => {
    const elements = [shape("a", "g"), locked("b", "g"), shape("c"), locked("d")];
    const { movable, frozen } = splitByLock(elements, ["a", "b", "c", "d"]);
    expect(ids(movable)).toEqual(["c"]);
    expect(ids(frozen)).toEqual(["a", "b", "d"]);
    expect(isFrozenUnit([shape("a"), locked("b")])).toBe(true);
    expect(isFrozenUnit([shape("a")])).toBe(false);
  });

  it("lets a member picked out of its group move unless it is locked itself", () => {
    const elements = [shape("a", "g"), locked("b", "g")];
    expect(ids(splitByLock(elements, ["a"]).movable)).toEqual(["a"]);
    expect(ids(splitByLock(elements, ["b"]).frozen)).toEqual(["b"]);
  });
});

describe("toggleUnitSelection", () => {
  const elements = [shape("a", "g"), shape("b", "g"), shape("c")];

  it("adds the whole group", () => {
    expect(toggleUnitSelection(elements, ["c"], "b")).toEqual(["c", "a", "b"]);
  });

  it("takes the whole group out", () => {
    expect(toggleUnitSelection(elements, ["a", "b", "c"], "a")).toEqual(["c"]);
  });
});

describe("groupInStack", () => {
  it("makes the members contiguous at the topmost member, keeping their order", () => {
    const elements = [shape("a"), shape("b"), shape("c"), shape("d"), shape("e")];
    const grouped = groupInStack(elements, ["e", "b", "d"], "g");
    expect(ids(grouped)).toEqual(["a", "c", "b", "d", "e"]);
    expect(groupIds(grouped)).toEqual([undefined, undefined, "g", "g", "g"]);
  });

  it("leaves elements above the block above it", () => {
    const grouped = groupInStack([shape("a"), shape("b"), shape("c"), shape("d")], ["a", "c"], "g");
    expect(ids(grouped)).toEqual(["b", "a", "c", "d"]);
  });

  it("hands back the same list when no id matches", () => {
    const elements = [shape("a"), shape("b")];
    expect(groupInStack(elements, ["zzz"], "g")).toBe(elements);
  });

  it("moves members of earlier groups into the new one", () => {
    const grouped = normaliseGroups(groupInStack([shape("a", "old"), shape("b", "old"), shape("c")], ["a", "b", "c"], "new"));
    expect(groupIds(grouped)).toEqual(["new", "new", "new"]);
  });
});

describe("ungroupInStack", () => {
  it("dissolves every group one of the ids belongs to", () => {
    const elements = [shape("a", "g"), shape("b", "g"), shape("c", "h"), shape("d", "h")];
    const ungrouped = ungroupInStack(elements, ["a"]);
    expect(groupIds(ungrouped)).toEqual([undefined, undefined, "h", "h"]);
    expect("groupId" in ungrouped[0]).toBe(false);
    expect(ungrouped[2]).toBe(elements[2]);
  });

  it("hands back the same list when nothing is grouped", () => {
    const elements = [shape("a"), shape("b")];
    expect(ungroupInStack(elements, ["a", "b"])).toBe(elements);
  });
});

describe("normaliseGroups", () => {
  it("strips a groupId only one element still has", () => {
    const elements = [shape("a", "g"), shape("b", "h"), shape("c", "h")];
    expect(groupIds(normaliseGroups(elements))).toEqual([undefined, "h", "h"]);
  });

  it("hands back the same list when every group is whole", () => {
    const elements = [shape("a", "g"), shape("b", "g"), shape("c")];
    expect(normaliseGroups(elements)).toBe(elements);
  });
});

describe("freshGroupIds", () => {
  it("turns copies of one group into one new group", () => {
    const copies = freshGroupIds([shape("a", "g"), shape("b", "g"), shape("c", "h"), shape("d", "h")]);
    const [first, second, third, fourth] = groupIds(copies);
    expect(first).toBeDefined();
    expect(first).not.toBe("g");
    expect(second).toBe(first);
    expect(third).not.toBe("h");
    expect(fourth).toBe(third);
    expect(third).not.toBe(first);
  });

  it("gives a lone copied member no group", () => {
    expect(groupIds(freshGroupIds([shape("a", "g"), shape("b")]))).toEqual([undefined, undefined]);
  });

  it("gives every call its own ids, so two pastes make two groups", () => {
    const original = [shape("a", "g"), shape("b", "g")];
    expect(freshGroupIds(original)[0].groupId).not.toBe(freshGroupIds(original)[0].groupId);
  });
});

describe("groupAction", () => {
  it("offers group for two or more units", () => {
    expect(groupAction([shape("a"), shape("b")])).toBe("group");
    expect(groupAction([shape("a", "g"), shape("b", "g"), shape("c")])).toBe("group");
  });

  it("offers ungroup for exactly one group", () => {
    expect(groupAction([shape("a", "g"), shape("b", "g")])).toBe("ungroup");
  });

  it("offers nothing for one element", () => {
    expect(groupAction([shape("a")])).toBeNull();
    expect(groupAction([shape("a", "g")])).toBeNull();
  });
});
