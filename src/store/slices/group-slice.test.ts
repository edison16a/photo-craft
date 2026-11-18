import { beforeEach, describe, expect, it } from "vitest";
import { createShapeElement } from "../../model/element-factories";
import { createProject } from "../../model/project-factories";
import type { CanvasElement } from "../../model/types";
import { useProjectStore } from "../project-store";

const store = () => useProjectStore.getState();
const elements = (): CanvasElement[] => store().project!.pages[0].elements;
const ids = () => elements().map((element) => element.id);
const groupOf = (id: string) => elements().find((element) => element.id === id)?.groupId;
const xOf = (id: string) => elements().find((element) => element.id === id)?.x;

describe("group actions", () => {
  beforeEach(() => {
    store().loadProject(createProject("Test", 800, 600));
    store().addElements(
      ["a", "b", "c", "d"].map((id, index) => createShapeElement("rectangle", { id, x: index * 100, width: 50, height: 50 })),
    );
  });

  it("groups the selection in one undo step and selects every member", () => {
    store().groupElements(["d", "b"]);
    expect(ids()).toEqual(["a", "c", "b", "d"]);
    expect(groupOf("b")).toBeDefined();
    expect(groupOf("b")).toBe(groupOf("d"));
    expect(store().selectedIds).toEqual(["b", "d"]);
    store().undo();
    expect(ids()).toEqual(["a", "b", "c", "d"]);
    expect(groupOf("b")).toBeUndefined();
    store().redo();
    expect(groupOf("d")).toBe(groupOf("b"));
  });

  it("needs at least two units", () => {
    store().groupElements(["a", "b"]);
    const before = store().history.past.length;
    store().groupElements(["a", "b"]);
    store().groupElements(["c"]);
    expect(store().history.past.length).toBe(before);
  });

  it("puts groups and loose elements into one new group", () => {
    store().groupElements(["a", "b"]);
    const old = groupOf("a");
    store().groupElements(["a", "b", "c"]);
    expect(groupOf("a")).not.toBe(old);
    expect(new Set(["a", "b", "c"].map(groupOf)).size).toBe(1);
  });

  it("ungroups and keeps the same selection", () => {
    store().groupElements(["a", "b"]);
    store().ungroupElements(["a"]);
    expect(groupOf("a")).toBeUndefined();
    expect(groupOf("b")).toBeUndefined();
    expect(store().selectedIds).toEqual(["a", "b"]);
    store().undo();
    expect(groupOf("a")).toBe(groupOf("b"));
  });

  it("duplicates a group as a separate new group", () => {
    store().groupElements(["a", "b"]);
    const original = groupOf("a");
    store().duplicateElements(["a", "b"]);
    const copies = elements().slice(-2);
    expect(copies[0].groupId).toBeDefined();
    expect(copies[0].groupId).toBe(copies[1].groupId);
    expect(copies[0].groupId).not.toBe(original);
    expect(store().selectedIds).toEqual(copies.map((element) => element.id));
  });

  it("pastes a copied group as a new group each time", () => {
    store().groupElements(["a", "b"]);
    store().copy(["a", "b"]);
    store().paste();
    store().paste();
    const groups = new Set(elements().map((element) => element.groupId).filter(Boolean));
    expect(groups.size).toBe(3);
  });

  it("drops the group when a delete leaves one member", () => {
    store().groupElements(["a", "b"]);
    store().removeElements(["a"]);
    expect(groupOf("b")).toBeUndefined();
  });

  it("flips and turns a group in one undo step each", () => {
    const pick = (key: "x" | "rotation") => ["a", "b"].map((id) => elements().find((element) => element.id === id)?.[key]);
    store().groupElements(["a", "b"]);
    store().flip(["a", "b"], "x");
    expect(pick("x")).toEqual([100, 0]);
    store().rotateQuarter(["a", "b"]);
    expect(pick("rotation")).toEqual([90, 90]);
    store().undo();
    store().undo();
    expect(pick("x")).toEqual([0, 100]);
  });

  it("holds a group with a locked member still for nudge, align and flip", () => {
    store().groupElements(["a", "b"]);
    store().setLocked(["b"], true);
    const before = store().history.past.length;
    store().nudge(["a", "b"], 10, 0);
    store().align(["a", "b"], "right");
    store().flip(["a", "b"], "x");
    expect(["a", "b"].map(xOf)).toEqual([0, 100]);
    expect(store().history.past.length).toBe(before);
  });

  it("nudges the rest of the selection, and a member picked out on its own", () => {
    store().groupElements(["a", "b"]);
    store().setLocked(["b"], true);
    store().nudge(["a", "b", "c"], 10, 0);
    expect(["a", "b", "c"].map(xOf)).toEqual([0, 100, 210]);
    store().nudge(["a"], 10, 0);
    expect(["a", "b"].map(xOf)).toEqual([10, 100]);
  });
});
