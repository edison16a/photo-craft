/**
 * Turns files and URLs into data URL images the editor can store.
 *
 * Every image element keeps its pixels as a data URL so saving to IndexedDB
 * and exporting never run into cross origin limits. This module is the one
 * place that knows how to get from "the user handed us something" to that
 * data URL: reading files, downloading from other hosts, rasterising SVG and
 * shrinking pictures that are too big to be useful on a page.
 */

/** A picture ready to be placed on a page. The src is always a data URL. */
export interface LoadedImage {
  src: string;
  width: number;
  height: number;
}

/**
 * Longest side we keep when importing. Anything bigger is drawn down to
 * this size so projects stay small enough to save and render smoothly.
 */
export const MAX_IMPORT_DIMENSION = 4096;

/** MIME types the importer accepts. Everything else is refused up front. */
export const ACCEPTED_IMAGE_TYPES: string[] = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "image/avif",
];

/** Extensions we map to a MIME type when the browser gives a file no type. */
const EXTENSION_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  avif: "image/avif",
};

const SVG_TYPE = "image/svg+xml";

const UNSUPPORTED_MESSAGE = "That file is not a supported image. Use PNG, JPEG, GIF, WebP, BMP, SVG or AVIF.";

const HOST_BLOCKED_MESSAGE = "This image host does not allow downloads. Save the image and upload it instead.";

/**
 * Works out the MIME type of a file. Trusts the browser's type when there is
 * one and otherwise guesses from the extension, because drags from some apps
 * arrive with an empty type. Returns undefined when there is no usable answer.
 */
function resolveImageType(file: File): string | undefined {
  const declared = file.type.trim().toLowerCase();
  if (declared) return declared;
  const dot = file.name.lastIndexOf(".");
  if (dot < 0) return undefined;
  return EXTENSION_TYPES[file.name.slice(dot + 1).toLowerCase()];
}

/** True when the file is an image type we know how to import. */
export function isSupportedImageFile(file: File): boolean {
  const type = resolveImageType(file);
  return type !== undefined && ACCEPTED_IMAGE_TYPES.includes(type);
}

/** True when the string is a data URL of any kind. Case and surrounding whitespace do not matter. */
export function isDataUrl(value: string): boolean {
  return /^data:/i.test(value.trim());
}

/**
 * Reads a Blob or File into a base64 data URL with FileReader. Rejects with
 * a readable Error when the browser cannot read it.
 */
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the file as a data URL."));
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Loads a source into an HTMLImageElement and resolves once it has decoded.
 * Http(s) sources are requested with crossOrigin "anonymous" so the pixels
 * can later be drawn to a canvas without tainting it. Rejects with a readable
 * Error when the browser refuses the request or cannot decode the bytes.
 */
export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:/i.test(src.trim())) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load that image."));
    image.src = src;
  });
}

/**
 * Draws an image to a canvas and hands back a PNG data URL plus its final
 * size. When a side is over maxDimension both sides are scaled down together
 * so the ratio holds. The output is always PNG because we cannot tell whether
 * the picture has transparency, and PNG keeps it when it does. Throws when
 * the image has no size or the canvas cannot be used.
 */
export function imageToDataUrl(
  image: HTMLImageElement,
  maxDimension: number = MAX_IMPORT_DIMENSION,
): { src: string; width: number; height: number } {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (sourceWidth <= 0 || sourceHeight <= 0) throw new Error("The image has no size, so it cannot be drawn.");
  const limit = Math.max(1, maxDimension);
  const scale = Math.min(1, limit / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get a drawing context for the image.");
  context.drawImage(image, 0, 0, width, height);
  return { src: canvas.toDataURL("image/png"), width, height };
}

/**
 * Decides whether a freshly read data URL can be stored as it is. Keeps the
 * original bytes when nothing needs to change, since re-encoding would only
 * lose quality and grow the file. SVG is always rasterised so every renderer
 * treats it the same, and oversized pictures are drawn down.
 */
async function finishImport(dataUrl: string, type: string | undefined): Promise<LoadedImage> {
  const image = await loadHtmlImage(dataUrl);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const isSvg = type === SVG_TYPE || /^data:image\/svg\+xml/i.test(dataUrl);
  const tooBig = Math.max(width, height) > MAX_IMPORT_DIMENSION;
  if (!isSvg && !tooBig && width > 0 && height > 0) return { src: dataUrl, width, height };
  return imageToDataUrl(image);
}

/**
 * Imports a file the user picked or dropped. Refuses types we do not support
 * with a message that names the accepted formats. Reads the file to a data
 * URL and keeps that data URL untouched unless the picture is SVG or larger
 * than MAX_IMPORT_DIMENSION on a side, in which case it is drawn to a canvas.
 */
export async function importImageFile(file: File): Promise<LoadedImage> {
  const type = resolveImageType(file);
  if (type === undefined || !ACCEPTED_IMAGE_TYPES.includes(type)) throw new Error(UNSUPPORTED_MESSAGE);
  const source: Blob = file.type ? file : new Blob([file], { type });
  const dataUrl = await fileToDataUrl(source);
  return finishImport(dataUrl, type);
}

/**
 * Imports an image from a URL. Data URLs are kept as they are and only
 * measured. Anything else is first downloaded with a CORS fetch and read as
 * a data URL. If the host refuses, we fall back to loading the URL straight
 * into an image element and drawing it to a canvas. If that fails too the
 * host does not want us to have the pixels, and the error tells the user to
 * save the picture and upload it instead.
 */
export async function importImageFromUrl(url: string): Promise<LoadedImage> {
  const source = url.trim();
  if (isDataUrl(source)) {
    const image = await loadHtmlImage(source);
    return { src: source, width: image.naturalWidth, height: image.naturalHeight };
  }
  try {
    const response = await fetch(source, { mode: "cors" });
    if (!response.ok) throw new Error(`Download failed with status ${response.status}.`);
    const blob = await response.blob();
    const dataUrl = await fileToDataUrl(blob);
    return await finishImport(dataUrl, blob.type.toLowerCase() || undefined);
  } catch {
    // The host blocked the download or served something that is not an
    // image. The image element route below sometimes still works.
  }
  try {
    const image = await loadHtmlImage(source);
    return imageToDataUrl(image);
  } catch {
    throw new Error(HOST_BLOCKED_MESSAGE);
  }
}
