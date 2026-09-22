/**
 * Whether resizing an element keeps its proportions. Images and drawn
 * shapes do unless the user switches it off; preset shapes do not unless
 * the user switches it on. Text is handled on its own: its corners scale
 * the font and its sides reflow the words.
 */
import type { CanvasElement } from "../model/types";

export function keepsRatio(element: CanvasElement): boolean {
  if (element.lockRatio !== undefined) return element.lockRatio;
  return element.type === "image" || (element.type === "shape" && element.shape === "custom");
}
