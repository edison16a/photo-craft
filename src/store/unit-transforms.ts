/**
 * Flipping and quarter turns for a selection that may hold groups. A group
 * with two or more selected members mirrors or turns as one piece about
 * the centre of its bounds. An element on its own flips or turns in place.
 */
import { centerOf, normalizeDegrees, unionRects } from "../lib/geometry";
import { splitIntoUnits } from "../lib/groups";
import type { CanvasElement, Point } from "../model/types";
import { elementBounds } from "./alignment";

/**
 * Flips the selected elements. A group mirrors each member's centre across
 * the group's centre line, toggles its flip and negates its rotation, so
 * the arrangement turns into its mirror image. A group with a locked
 * member is left alone. Hands back the same list when nothing changed.
 */
export function flipUnits(elements: CanvasElement[], ids: readonly string[], axis: "x" | "y"): CanvasElement[] {
  const changes = new Map<string, CanvasElement>();
  const toggled = (element: CanvasElement) =>
    axis === "x" ? { ...element, flipX: !element.flipX } : { ...element, flipY: !element.flipY };

  for (const unit of selectedUnits(elements, ids)) {
    if (unit.length === 1) {
      changes.set(unit[0].id, toggled(unit[0]));
      continue;
    }
    if (unit.some((element) => element.locked)) continue;
    const centre = unitCentre(unit);
    for (const element of unit) {
      const own = centerOf(element);
      const mirrored = axis === "x" ? { x: 2 * centre.x - own.x, y: own.y } : { x: own.x, y: 2 * centre.y - own.y };
      changes.set(element.id, { ...movedTo(toggled(element), mirrored), rotation: normalizeDegrees(-element.rotation) });
    }
  }
  return applyChanges(elements, changes);
}

/**
 * Turns the selected elements a quarter turn clockwise. A group turns
 * about its centre, so its members swing round it. Locked elements, and
 * groups with a locked member, stay as they are. Hands back the same list
 * when nothing changed.
 */
export function rotateUnitsQuarter(elements: CanvasElement[], ids: readonly string[]): CanvasElement[] {
  const changes = new Map<string, CanvasElement>();
  for (const unit of selectedUnits(elements, ids)) {
    if (unit.some((element) => element.locked)) continue;
    const centre = unitCentre(unit);
    for (const element of unit) {
      const rotation = normalizeDegrees(element.rotation + 90);
      if (unit.length === 1) {
        changes.set(element.id, { ...element, rotation });
        continue;
      }
      // A clockwise quarter turn on screen, where y points down.
      const own = centerOf(element);
      const turned = { x: centre.x - (own.y - centre.y), y: centre.y + (own.x - centre.x) };
      changes.set(element.id, { ...movedTo(element, turned), rotation });
    }
  }
  return applyChanges(elements, changes);
}

function selectedUnits(elements: CanvasElement[], ids: readonly string[]): CanvasElement[][] {
  const wanted = new Set(ids);
  return splitIntoUnits(elements.filter((element) => wanted.has(element.id)));
}

function unitCentre(unit: CanvasElement[]): Point {
  return centerOf(unionRects(unit.map(elementBounds)));
}

/** The element with its box centre moved to the point. */
function movedTo(element: CanvasElement, centre: Point): CanvasElement {
  return { ...element, x: round(centre.x - element.width / 2), y: round(centre.y - element.height / 2) };
}

function applyChanges(elements: CanvasElement[], changes: Map<string, CanvasElement>): CanvasElement[] {
  if (changes.size === 0) return elements;
  return elements.map((element) => changes.get(element.id) ?? element);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
