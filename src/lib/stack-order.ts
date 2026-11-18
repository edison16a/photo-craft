/**
 * Stacking order on a page that may hold groups. A group is one block in
 * the stack, so reordering works at two levels. A unit given whole moves
 * among the page's units and passes a neighbouring group in one step.
 * Members picked out of a group move among that group's own members and
 * never leave it. Either way every group stays one block.
 */
import type { CanvasElement } from "../model/types";
import { unitKey } from "./groups";

/** How far to move elements in the stacking order. */
export type StackDirection = "forward" | "backward" | "front" | "back";

/**
 * Moves the elements with the given ids up or down the stacking order.
 * "forward" and "backward" step past the nearest unit that is not moving,
 * or the nearest member when they move inside a group. "front" and "back"
 * go to the top or bottom of the page, or of the group. Moving items keep
 * their own order. Hands back the same list when nothing moved.
 */
export function restack(
  elements: CanvasElement[],
  ids: readonly string[],
  direction: StackDirection,
): CanvasElement[] {
  const moving = new Set(ids);
  const isMoving = (element: CanvasElement) => moving.has(element.id);
  const whole = (block: CanvasElement[]) => block.every(isMoving);
  const blocks = stackBlocks(elements).map((block) =>
    whole(block) || !block.some(isMoving) ? block : shift(block, isMoving, direction),
  );
  const result = shift(blocks, whole, direction).flat();
  return result.some((element, index) => element !== elements[index]) ? result : elements;
}

/**
 * Splits the stack into blocks of consecutive elements from the same unit.
 * A whole group is one block. A group whose members are apart, as older
 * saves can have, is a few blocks.
 */
function stackBlocks(elements: readonly CanvasElement[]): CanvasElement[][] {
  const blocks: CanvasElement[][] = [];
  let previous: string | undefined;
  for (const element of elements) {
    const key = unitKey(element);
    if (blocks.length > 0 && key === previous) blocks[blocks.length - 1].push(element);
    else blocks.push([element]);
    previous = key;
  }
  return blocks;
}

/** Moves the items that match one step, or to the end, keeping their order. */
function shift<T>(items: readonly T[], moves: (item: T) => boolean, direction: StackDirection): T[] {
  if (direction === "front") return [...items.filter((item) => !moves(item)), ...items.filter(moves)];
  if (direction === "back") return [...items.filter(moves), ...items.filter((item) => !moves(item))];
  const result = [...items];
  if (direction === "forward") {
    for (let i = result.length - 2; i >= 0; i -= 1) {
      if (moves(result[i]) && !moves(result[i + 1])) [result[i], result[i + 1]] = [result[i + 1], result[i]];
    }
  } else {
    for (let i = 1; i < result.length; i += 1) {
      if (moves(result[i]) && !moves(result[i - 1])) [result[i], result[i - 1]] = [result[i - 1], result[i]];
    }
  }
  return result;
}
