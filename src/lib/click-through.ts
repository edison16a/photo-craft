/**
 * Click again to select what is behind. Works out which units are drawn
 * under the pointer, from the ids of the elements Konva hits there, and
 * which one comes after the clicked one going down the stacking order.
 */
import type { CanvasElement } from "../model/types";
import { unitKey } from "./groups";

/**
 * Units under the pointer from top to bottom, each as the ids of all its
 * members in stacking order. `hits` holds the ids of the elements drawn
 * under the pointer, in any order. A group counts once, at the place of
 * its highest member that is hit. The element named by `include` counts
 * as hit too.
 */
export function unitsUnder(elements: readonly CanvasElement[], hits: readonly string[], include?: string): string[][] {
  const hit = new Set(hits);
  if (include) hit.add(include);
  const order: string[] = [];
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    if (!hit.has(element.id)) continue;
    const key = unitKey(element);
    if (!order.includes(key)) order.push(key);
  }
  return order.map((key) => elements.filter((element) => unitKey(element) === key).map((element) => element.id));
}

/**
 * The unit to select after a click on an element that was already
 * selected: the next unit below the clicked one's among those hit under
 * the pointer, wrapping from the bottom back to the top. Null when nothing
 * else is hit there.
 */
export function nextUnitUnder(
  elements: readonly CanvasElement[],
  clickedId: string,
  hits: readonly string[],
): string[] | null {
  const units = unitsUnder(elements, hits, clickedId);
  if (units.length < 2) return null;
  const current = units.findIndex((unit) => unit.includes(clickedId));
  return units[(current + 1) % units.length];
}
