/**
 * Finding the picture pixel under a point on the page, undoing what the
 * canvas does to draw it: position, scale, rotation around the box
 * centre and flips.
 */
import type { ElementBase, Point } from "../model/types";
import { degToRad } from "./geometry";

/** The parts of an element that decide where its picture lands. */
export type PictureBox = Pick<ElementBase, "x" | "y" | "width" | "height" | "rotation" | "flipX" | "flipY">;

/**
 * The pixel of a picture of the given natural size under a page point,
 * as whole column and row numbers, or null when the point misses it.
 */
export function pagePointToPicturePixel(box: PictureBox, picture: { width: number; height: number }, point: Point): Point | null {
  if (box.width <= 0 || box.height <= 0 || picture.width <= 0 || picture.height <= 0) return null;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // Turn the point back the other way around the centre.
  const rad = degToRad(-box.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - cx;
  const dy = point.y - cy;
  let localX = dx * cos - dy * sin + box.width / 2;
  let localY = dx * sin + dy * cos + box.height / 2;
  if (box.flipX) localX = box.width - localX;
  if (box.flipY) localY = box.height - localY;
  const column = Math.floor((localX / box.width) * picture.width);
  const row = Math.floor((localY / box.height) * picture.height);
  if (column < 0 || row < 0 || column >= picture.width || row >= picture.height) return null;
  return { x: column, y: row };
}
