/**
 * Saving cutouts: one picture at any size, or all of them in a ZIP. The
 * cutout is redrawn on a canvas at the requested size, so the download
 * can be larger or smaller than the picture that went in.
 */
import { downloadBlob, safeFilename } from "../download";
import { loadHtmlImage } from "../image-loading";
import { createZipBlob, type ZipEntry } from "../zip";
import type { RemovalItem } from "../../store/remove-bg-store";
import { sizeFromScale, type Size } from "./sizing";

/** Formats that keep transparency. */
export type CutoutFormat = "png" | "webp";

const MIME: Record<CutoutFormat, string> = { png: "image/png", webp: "image/webp" };

/** Draws a finished cutout at the given size and encodes it. */
export async function renderCutout(item: RemovalItem, size: Size, format: CutoutFormat): Promise<Blob> {
  if (!item.resultUrl) throw new Error("That picture has no cutout yet.");
  const image = await loadHtmlImage(item.resultUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw the picture.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, size.width, size.height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the picture."))), MIME[format], 0.92);
  });
}

/** The file name a cutout downloads as. */
export function cutoutFilename(item: RemovalItem, format: CutoutFormat): string {
  return `${safeFilename(item.name, "image")}-no-background.${format}`;
}

/** Saves one cutout at the given size. */
export async function downloadCutout(item: RemovalItem, size: Size, format: CutoutFormat): Promise<void> {
  downloadBlob(await renderCutout(item, size, format), cutoutFilename(item, format));
}

/**
 * Saves every finished cutout in one ZIP, each scaled by the same factor
 * so a "half size" choice applies to all of them. Names that collide get
 * a number so nothing is overwritten inside the archive.
 */
export async function downloadAllCutouts(items: RemovalItem[], scale: number, format: CutoutFormat): Promise<void> {
  const done = items.filter((item) => item.status === "done" && item.resultUrl);
  if (done.length === 0) throw new Error("No cutouts are finished yet.");
  const entries: ZipEntry[] = [];
  const used = new Map<string, number>();
  for (const item of done) {
    const blob = await renderCutout(item, sizeFromScale(item, scale), format);
    let name = cutoutFilename(item, format);
    const seen = used.get(name) ?? 0;
    used.set(name, seen + 1);
    if (seen > 0) name = name.replace(`.${format}`, `-${seen + 1}.${format}`);
    entries.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  downloadBlob(createZipBlob(entries), "cutouts.zip");
}
