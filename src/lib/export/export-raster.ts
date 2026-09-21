/**
 * Exports pages as PNG, JPG or WebP. Several pages become a ZIP file.
 */
import type { Page, Project } from "../../model/types";
import { safeFilename } from "../download";
import { createZipBlob } from "../zip";
import { exportPdf } from "./export-pdf";
import { formatOption, isScaleTooLarge, type ExportOptions } from "./export-options";
import { renderPageToCanvas } from "./render-page";

export interface ExportResult {
  blob: Blob;
  filename: string;
}

/** Wraps canvas.toBlob in a promise. */
export function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The browser could not encode the image."))),
      mimeType,
      quality,
    );
  });
}

/** Renders one page to an image blob using the export options. */
export async function renderPageBlob(project: Project, page: Page, options: ExportOptions): Promise<Blob> {
  const format = formatOption(options.format);
  const canvas = await renderPageToCanvas(project, page, {
    pixelRatio: options.scale,
    transparent: options.transparent && format.supportsTransparency,
  });
  return canvasToBlob(canvas, format.mimeType, format.supportsQuality ? options.quality : undefined);
}

/**
 * Exports the given pages of a project. One raster page gives a single
 * image, several give a ZIP, and PDF always gives one document.
 */
export async function exportPages(project: Project, pages: Page[], options: ExportOptions): Promise<ExportResult> {
  if (pages.length === 0) throw new Error("There is nothing to export.");
  if (isScaleTooLarge(project, options.scale)) {
    throw new Error("That size is too large for the browser to render. Pick a smaller scale.");
  }

  const base = safeFilename(project.name, "design");
  const format = formatOption(options.format);

  if (options.format === "pdf") {
    return { blob: await exportPdf(project, pages, options), filename: `${base}.pdf` };
  }

  if (pages.length === 1) {
    return { blob: await renderPageBlob(project, pages[0], options), filename: `${base}.${format.extension}` };
  }

  const entries = [];
  for (const [index, page] of pages.entries()) {
    const blob = await renderPageBlob(project, page, options);
    const name = `${String(index + 1).padStart(2, "0")}-${safeFilename(page.name, "page")}.${format.extension}`;
    entries.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  return { blob: createZipBlob(entries), filename: `${base}.zip` };
}
