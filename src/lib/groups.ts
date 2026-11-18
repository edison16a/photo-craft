/**
 * Groups. A group is the set of elements on a page that share a groupId.
 * Members stay in the page's flat element list and there is one level
 * only, so an element belongs to at most one group. A unit is what the
 * selection treats as one thing: a group, or an element on its own.
 */
import { createId } from "../model/ids";
import type { CanvasElement } from "../model/types";

/** What identifies an element's unit: its groupId, or its own id when it has none. */
export function unitKey(element: CanvasElement): string {
  return element.groupId ?? element.id;
}

/**
 * The given ids plus every other member of their groups, in stacking
 * order. Ids that are not in the list are dropped.
 */
export function expandToGroups(elements: readonly CanvasElement[], ids: readonly string[]): string[] {
  const wanted = new Set(ids);
  const groups = new Set<string>();
  for (const element of elements) {
    if (wanted.has(element.id) && element.groupId) groups.add(element.groupId);
  }
  return elements
    .filter((element) => wanted.has(element.id) || (element.groupId !== undefined && groups.has(element.groupId)))
    .map((element) => element.id);
}

/**
 * Splits a list of elements into units, keeping stacking order inside each
 * unit. Units come in the order of their lowest member. Only the elements
 * given count, so a group with one member selected is a unit of one.
 */
export function splitIntoUnits(elements: readonly CanvasElement[]): CanvasElement[][] {
  const units = new Map<string, CanvasElement[]>();
  for (const element of elements) {
    const key = unitKey(element);
    const unit = units.get(key);
    if (unit) unit.push(element);
    else units.set(key, [element]);
  }
  return [...units.values()];
}

/**
 * Whether a unit holds still. A unit with a locked member does not move,
 * resize or turn, so a lock never pulls a group apart.
 */
export function isFrozenUnit(unit: readonly CanvasElement[]): boolean {
  return unit.some((element) => element.locked);
}

/**
 * Splits the elements with the given ids into those free to move and
 * those held still because their unit has a locked member. Units come
 * from the given ids only, as in splitIntoUnits, so a member picked out of
 * its group moves unless it is locked itself. Both keep stacking order.
 */
export function splitByLock(
  elements: readonly CanvasElement[],
  ids: readonly string[],
): { movable: CanvasElement[]; frozen: CanvasElement[] } {
  const wanted = new Set(ids);
  const selected = elements.filter((element) => wanted.has(element.id));
  const frozenUnits = new Set(selected.filter((element) => element.locked).map(unitKey));
  const movable: CanvasElement[] = [];
  const frozen: CanvasElement[] = [];
  for (const element of selected) (frozenUnits.has(unitKey(element)) ? frozen : movable).push(element);
  return { movable, frozen };
}

/** Adds the element's whole unit to the selection, or takes it out when the element is selected. */
export function toggleUnitSelection(
  elements: readonly CanvasElement[],
  selectedIds: readonly string[],
  id: string,
): string[] {
  const unit = expandToGroups(elements, [id]);
  if (!selectedIds.includes(id)) return [...new Set([...selectedIds, ...unit])];
  const dropped = new Set(unit);
  return selectedIds.filter((selected) => !dropped.has(selected));
}

/**
 * Gives the elements one groupId and makes them a contiguous block in the
 * stacking order, placed where the topmost of them was. Their order among
 * themselves is kept. Hands back the same list when none of the ids is in it.
 */
export function groupInStack(elements: CanvasElement[], ids: readonly string[], groupId: string): CanvasElement[] {
  const members = new Set(ids);
  const top = elements.findLastIndex((element) => members.has(element.id));
  if (top < 0) return elements;
  const block = elements.filter((element) => members.has(element.id)).map((element) => ({ ...element, groupId }));
  const result: CanvasElement[] = [];
  elements.forEach((element, index) => {
    if (index === top) result.push(...block);
    else if (!members.has(element.id)) result.push(element);
  });
  return result;
}

/**
 * Dissolves every group that one of the ids belongs to. Hands back the
 * same list when none of them is grouped.
 */
export function ungroupInStack(elements: CanvasElement[], ids: readonly string[]): CanvasElement[] {
  const wanted = new Set(ids);
  const groups = new Set<string>();
  for (const element of elements) {
    if (wanted.has(element.id) && element.groupId) groups.add(element.groupId);
  }
  if (groups.size === 0) return elements;
  return elements.map((element) =>
    element.groupId !== undefined && groups.has(element.groupId) ? withoutGroup(element) : element,
  );
}

/**
 * Removes a groupId that fewer than two elements still share, for example
 * after a delete. Hands back the same list when every group is whole.
 */
export function normaliseGroups(elements: CanvasElement[]): CanvasElement[] {
  const counts = new Map<string, number>();
  for (const element of elements) {
    if (element.groupId) counts.set(element.groupId, (counts.get(element.groupId) ?? 0) + 1);
  }
  if (![...counts.values()].some((count) => count < 2)) return elements;
  return elements.map((element) =>
    element.groupId !== undefined && (counts.get(element.groupId) ?? 0) < 2 ? withoutGroup(element) : element,
  );
}

/**
 * Gives copied elements new groupIds, so the copies of one group become
 * one new group and never join the original. A lone copied member ends up
 * on its own.
 */
export function freshGroupIds(copies: CanvasElement[]): CanvasElement[] {
  const fresh = new Map<string, string>();
  const regrouped = copies.map((element) => {
    if (!element.groupId) return element;
    let groupId = fresh.get(element.groupId);
    if (!groupId) {
      groupId = createId("grp");
      fresh.set(element.groupId, groupId);
    }
    return { ...element, groupId };
  });
  return normaliseGroups(regrouped);
}

/**
 * What a group button offers for the selected elements: "group" when they
 * form two or more units, "ungroup" when they are exactly one group, and
 * null otherwise.
 */
export function groupAction(selected: readonly CanvasElement[]): "group" | "ungroup" | null {
  const units = splitIntoUnits(selected);
  if (units.length >= 2) return "group";
  if (units.length === 1 && units[0].length >= 2) return "ungroup";
  return null;
}

function withoutGroup(element: CanvasElement): CanvasElement {
  const copy = { ...element };
  delete copy.groupId;
  return copy;
}
