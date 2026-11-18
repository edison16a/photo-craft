/**
 * Small preview images for the home screen and the page strip.
 */
import type { Page, Project } from "../../model/types";
import { renderPageToDataUrl } from "./render-page";

/** Longest side of a thumbnail in pixels. */
export const THUMBNAIL_MAX_SIZE = 320;

/**
 * Renders a page as a small JPEG data URL, at most THUMBNAIL_MAX_SIZE wide
 * or tall. Keyed pictures use their small copy, so a save never waits on a
 * full size key just for a thumbnail.
 */
export async function renderThumbnail(project: Project, page: Page, maxSize = THUMBNAIL_MAX_SIZE): Promise<string> {
  const pixelRatio = Math.min(1, maxSize / Math.max(project.width, project.height));
  return renderPageToDataUrl(project, page, {
    pixelRatio,
    transparent: false,
    draft: true,
    mimeType: "image/jpeg",
    quality: 0.82,
  });
}
