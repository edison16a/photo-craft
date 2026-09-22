/**
 * Export settings and the maths for output size.
 */
import type { Project } from "../../model/types";

/** File formats the export dialog offers. */
export type ExportFormat = "png" | "jpeg" | "webp" | "pdf";

/** What the dialog needs to know about a format. */
export interface ExportFormatOption {
  id: ExportFormat;
  label: string;
  mimeType: string;
  extension: string;
  supportsTransparency: boolean;
  supportsQuality: boolean;
}

/** Every export format, in the order the dialog shows them. */
export const EXPORT_FORMATS: ExportFormatOption[] = [
  { id: "png", label: "PNG", mimeType: "image/png", extension: "png", supportsTransparency: true, supportsQuality: false },
  { id: "jpeg", label: "JPG", mimeType: "image/jpeg", extension: "jpg", supportsTransparency: false, supportsQuality: true },
  { id: "webp", label: "WebP", mimeType: "image/webp", extension: "webp", supportsTransparency: true, supportsQuality: true },
  { id: "pdf", label: "PDF", mimeType: "application/pdf", extension: "pdf", supportsTransparency: false, supportsQuality: true },
];

/** Quick size multipliers offered in the dialog. */
export const SCALE_PRESETS = [0.5, 1, 2, 3, 4];

/** Largest side we will render. Above this browsers start refusing canvases. */
export const MAX_EXPORT_DIMENSION = 16384;

/** Everything the export dialog collects. */
export interface ExportOptions {
  format: ExportFormat;
  /** Multiplier of the project size. 1 means the project's own pixel size. */
  scale: number;
  /** 0 to 1, used by JPG, WebP and PDF. */
  quality: number;
  transparent: boolean;
  /** "current" exports one page, "all" exports every page. */
  pages: "current" | "all";
}

/** What the dialog starts with: one PNG of the current page at its own size. */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "png",
  scale: 1,
  quality: 0.92,
  transparent: false,
  pages: "current",
};

/** Looks up the format definition. */
export function formatOption(format: ExportFormat): ExportFormatOption {
  return EXPORT_FORMATS.find((option) => option.id === format) ?? EXPORT_FORMATS[0];
}

/** Output size in pixels for a project at a scale. */
export function outputSize(project: Pick<Project, "width" | "height">, scale: number) {
  return { width: Math.max(1, Math.round(project.width * scale)), height: Math.max(1, Math.round(project.height * scale)) };
}

/** Scale that produces exactly the given output width. */
export function scaleForWidth(project: Pick<Project, "width">, width: number): number {
  return width / project.width;
}

/** Largest scale that keeps both sides at or under the export limit. */
export function maxScaleFor(project: Pick<Project, "width" | "height">): number {
  return Math.min(MAX_EXPORT_DIMENSION / project.width, MAX_EXPORT_DIMENSION / project.height);
}

/** True when the scale would exceed the render limit. */
export function isScaleTooLarge(project: Pick<Project, "width" | "height">, scale: number): boolean {
  return scale > maxScaleFor(project);
}
