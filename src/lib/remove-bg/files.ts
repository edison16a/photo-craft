/**
 * Turning what the user hands the remove background page into items:
 * files from a picker, a drop or a paste, and image links from a paste.
 */
import { dataUrlToBlob } from "../download";
import { importImageFile, importImageFromUrl, type LoadedImage } from "../image-loading";
import type { RemovalItem } from "../../store/remove-bg-store";

let counter = 0;

/** A unique id for an item on this page load. */
function nextId(): string {
  counter += 1;
  return `cut-${Date.now().toString(36)}-${counter}`;
}

/** "holiday.JPG" becomes "holiday". A name with no dot is kept whole. */
export function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/** A queued item for a decoded picture. Creates an object URL the caller owns. */
export function itemFromLoadedImage(loaded: LoadedImage, name: string): RemovalItem {
  const original = dataUrlToBlob(loaded.src);
  return {
    id: nextId(),
    name: name.trim() || "image",
    original,
    originalUrl: URL.createObjectURL(original),
    width: loaded.width,
    height: loaded.height,
    status: "queued",
  };
}

/**
 * Decodes a file into an item. Throws with a readable message for files
 * that are not images. Huge pictures are drawn down to a sane size first.
 */
export async function itemFromFile(file: File): Promise<RemovalItem> {
  return itemFromLoadedImage(await importImageFile(file), stripExtension(file.name));
}

/** Downloads an image link into an item. Throws with a readable message when the host refuses. */
export async function itemFromUrl(url: string): Promise<RemovalItem> {
  const name = stripExtension(decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? ""));
  return itemFromLoadedImage(await importImageFromUrl(url), name || "image");
}

/** Frees the object URLs of an item that is leaving the page. */
export function releaseItem(item: RemovalItem): void {
  URL.revokeObjectURL(item.originalUrl);
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
}
