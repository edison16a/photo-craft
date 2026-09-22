/**
 * Painting on a cutout after the model has done its work: a restore brush
 * that brings the original picture back where it is painted and an erase
 * brush that clears more away. Each picture gets a working canvas at its
 * own size; strokes are stamped onto it and the display copies it.
 */
import { loadHtmlImage } from "../image-loading";
import type { RemovalItem } from "../../store/remove-bg-store";

/** The two brushes. */
export type BrushMode = "restore" | "erase";

/** A brush: size in picture pixels and how soft its edge is, from 0 to 1. */
export interface Brush {
  mode: BrushMode;
  size: number;
  softness: number;
}

/** The working canvas of one picture plus its undo stack and original. */
export interface TouchUpWork {
  canvas: HTMLCanvasElement;
  original: HTMLImageElement;
  /** Earlier states, oldest first. */
  undo: ImageData[];
}

/** How many strokes can be undone. Each one keeps a whole copy of the picture. */
const UNDO_DEPTH = 8;

/** Stamps per brush width along a stroke. More means smoother, slower. */
const STAMPS_PER_WIDTH = 4;

const works = new Map<string, TouchUpWork>();

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not draw the picture.");
  return ctx;
}

/** The working canvas for a picture, made from its current cutout on first use. */
export async function getWork(item: RemovalItem): Promise<TouchUpWork> {
  const existing = works.get(item.id);
  if (existing) return existing;
  if (!item.resultUrl) throw new Error("That picture has no cutout yet.");
  const [cutout, original] = await Promise.all([loadHtmlImage(item.resultUrl), loadHtmlImage(item.originalUrl)]);
  const canvas = document.createElement("canvas");
  canvas.width = item.width;
  canvas.height = item.height;
  context(canvas).drawImage(cutout, 0, 0, item.width, item.height);
  const work = { canvas, original, undo: [] };
  works.set(item.id, work);
  return work;
}

/** Forgets a picture's working canvas, for when it leaves the page or is reset. */
export function dropWork(id: string): void {
  works.delete(id);
}

/** Remembers the current state so the next stroke can be undone. */
export function beginStroke(work: TouchUpWork): void {
  const ctx = context(work.canvas);
  work.undo.push(ctx.getImageData(0, 0, work.canvas.width, work.canvas.height));
  if (work.undo.length > UNDO_DEPTH) work.undo.shift();
}

/** Puts back the state before the last stroke. False when there is nothing to undo. */
export function undoStroke(work: TouchUpWork): boolean {
  const previous = work.undo.pop();
  if (!previous) return false;
  context(work.canvas).putImageData(previous, 0, 0);
  return true;
}

/** Paints one round stamp of the brush, soft at the edge as asked, onto a context. */
function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, brush: Brush): void {
  const radius = brush.size / 2;
  const inner = radius * (1 - Math.min(1, Math.max(0, brush.softness)));
  const gradient = ctx.createRadialGradient(x, y, inner, x, y, radius);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Stamps the brush along a segment, spaced by a fraction of its width. */
function stampAlong(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, brush: Brush): void {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const spacing = Math.max(1, brush.size / STAMPS_PER_WIDTH);
  const steps = Math.max(1, Math.ceil(distance / spacing));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    stamp(ctx, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, brush);
  }
}

/**
 * Applies a brush along a segment of a stroke, in picture pixels. Erasing
 * takes alpha away; restoring paints the original picture back through
 * the brush, so what the model removed can be brought back.
 */
export function paintSegment(work: TouchUpWork, from: { x: number; y: number }, to: { x: number; y: number }, brush: Brush): void {
  const ctx = context(work.canvas);
  if (brush.mode === "erase") {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    stampAlong(ctx, from, to, brush);
    ctx.restore();
    return;
  }
  // Only the box around the segment is worked on, so big pictures stay quick.
  const pad = brush.size;
  const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - pad));
  const top = Math.max(0, Math.floor(Math.min(from.y, to.y) - pad));
  const right = Math.min(work.canvas.width, Math.ceil(Math.max(from.x, to.x) + pad));
  const bottom = Math.min(work.canvas.height, Math.ceil(Math.max(from.y, to.y) + pad));
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return;
  const patch = document.createElement("canvas");
  patch.width = width;
  patch.height = height;
  const patchContext = context(patch);
  stampAlong(patchContext, { x: from.x - left, y: from.y - top }, { x: to.x - left, y: to.y - top }, brush);
  patchContext.globalCompositeOperation = "source-in";
  patchContext.drawImage(work.original, left, top, width, height, 0, 0, width, height);
  ctx.drawImage(patch, left, top);
}

/** Encodes the working canvas as a PNG with transparency. */
export function workToBlob(work: TouchUpWork): Promise<Blob> {
  return new Promise((resolve, reject) => {
    work.canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the picture."))), "image/png");
  });
}
