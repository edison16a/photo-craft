/**
 * Reading one pixel of a picture by drawing just that pixel into a one by
 * one canvas, so the whole picture is never copied.
 */
import type { ImageElement, Point } from "../model/types";
import { pagePointToPicturePixel } from "./picture-point";

/** One pixel's colour as #rrggbb, with its alpha from 0 to 255. */
export interface PixelSample {
  color: string;
  alpha: number;
}

let canvas: HTMLCanvasElement | null = null;

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

/** The colour of one pixel of a picture, by column and row, or null when the browser cannot read it. */
export function samplePixel(image: CanvasImageSource, column: number, row: number): PixelSample | null {
  canvas ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 });
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.clearRect(0, 0, 1, 1);
  context.drawImage(image, column, row, 1, 1, 0, 0, 1, 1);
  const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
  return { color: toHex(r, g, b), alpha };
}

/**
 * The picture's own colour under a page point, before any key or flat
 * colour, or null when the point is off the picture.
 */
export function sampleImageAt(element: ImageElement, image: HTMLImageElement, point: Point): PixelSample | null {
  const picture = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
  const pixel = pagePointToPicturePixel(element, picture, point);
  return pixel ? samplePixel(image, pixel.x, pixel.y) : null;
}
