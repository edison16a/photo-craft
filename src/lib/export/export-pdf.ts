/**
 * PDF export through jsPDF. Each project page becomes one PDF page at the
 * project's pixel size, rendered at the chosen scale for sharpness.
 */
import type { Page, Project } from "../../model/types";
import type { ExportOptions } from "./export-options";
import { renderPageToCanvas } from "./render-page";

/** Builds a multi page PDF blob. */
export async function exportPdf(project: Project, pages: Page[], options: ExportOptions): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const orientation = project.width >= project.height ? "landscape" : "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "px",
    format: [project.width, project.height],
    hotfixes: ["px_scaling"],
    compress: true,
  });

  for (const [index, page] of pages.entries()) {
    if (index > 0) doc.addPage([project.width, project.height], orientation);
    const canvas = await renderPageToCanvas(project, page, { pixelRatio: options.scale, transparent: false });
    const dataUrl = canvas.toDataURL("image/jpeg", options.quality);
    doc.addImage(dataUrl, "JPEG", 0, 0, project.width, project.height, undefined, "FAST");
  }

  return doc.output("blob");
}
