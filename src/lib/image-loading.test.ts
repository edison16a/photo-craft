import { describe, expect, it } from "vitest";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMPORT_DIMENSION,
  fileToDataUrl,
  importImageFile,
  isDataUrl,
  isSupportedImageFile,
} from "./image-loading";

/** A 1 by 1 transparent PNG, the smallest real image we can hand to a Blob. */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function tinyPngBytes(): Uint8Array<ArrayBuffer> {
  const binary = atob(TINY_PNG_BASE64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function makeFile(name: string, type: string): File {
  return new File([tinyPngBytes()], name, { type });
}

describe("constants", () => {
  it("accepts the seven image types the editor supports", () => {
    expect(ACCEPTED_IMAGE_TYPES).toEqual([
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/svg+xml",
      "image/avif",
    ]);
  });

  it("caps imports at 4096 pixels on the longest side", () => {
    expect(MAX_IMPORT_DIMENSION).toBe(4096);
  });
});

describe("isSupportedImageFile", () => {
  it("accepts every listed MIME type", () => {
    for (const type of ACCEPTED_IMAGE_TYPES) {
      expect(isSupportedImageFile(makeFile("picture", type))).toBe(true);
    }
  });

  it("ignores the case of the declared type", () => {
    expect(isSupportedImageFile(makeFile("photo.png", "IMAGE/PNG"))).toBe(true);
  });

  it("rejects types that are not images", () => {
    expect(isSupportedImageFile(makeFile("notes.txt", "text/plain"))).toBe(false);
    expect(isSupportedImageFile(makeFile("paper.pdf", "application/pdf"))).toBe(false);
    expect(isSupportedImageFile(makeFile("clip.mp4", "video/mp4"))).toBe(false);
  });

  it("rejects image types outside the list even though they are images", () => {
    expect(isSupportedImageFile(makeFile("scan.tiff", "image/tiff"))).toBe(false);
  });

  it("falls back to the extension when the browser gives no type", () => {
    expect(isSupportedImageFile(makeFile("photo.webp", ""))).toBe(true);
    expect(isSupportedImageFile(makeFile("Logo.SVG", ""))).toBe(true);
    expect(isSupportedImageFile(makeFile("shot.JPG", ""))).toBe(true);
    expect(isSupportedImageFile(makeFile("notes.txt", ""))).toBe(false);
    expect(isSupportedImageFile(makeFile("noextension", ""))).toBe(false);
  });

  it("does not let a matching extension rescue a wrong declared type", () => {
    expect(isSupportedImageFile(makeFile("photo.png", "text/plain"))).toBe(false);
  });
});

describe("isDataUrl", () => {
  it("recognises data URLs of any media type", () => {
    expect(isDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isDataUrl("data:text/plain,hello")).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(isDataUrl("DATA:image/png;base64,AAAA")).toBe(true);
    expect(isDataUrl("  data:image/gif;base64,AAAA\n")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isDataUrl("https://example.com/cat.png")).toBe(false);
    expect(isDataUrl("http://example.com/cat.png")).toBe(false);
    expect(isDataUrl("blob:https://example.com/abc")).toBe(false);
    expect(isDataUrl("cat.png")).toBe(false);
    expect(isDataUrl("")).toBe(false);
    expect(isDataUrl("the word data: appears later")).toBe(false);
  });
});

describe("fileToDataUrl", () => {
  it("reads a PNG blob into a base64 data URL with the same bytes", async () => {
    const blob = new Blob([tinyPngBytes()], { type: "image/png" });
    const dataUrl = await fileToDataUrl(blob);
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(dataUrl.slice("data:image/png;base64,".length)).toBe(TINY_PNG_BASE64);
    expect(isDataUrl(dataUrl)).toBe(true);
  });

  it("accepts a File, since File is a Blob", async () => {
    const dataUrl = await fileToDataUrl(makeFile("dot.png", "image/png"));
    expect(dataUrl).toBe(`data:image/png;base64,${TINY_PNG_BASE64}`);
  });

  it("carries the blob type into the data URL", async () => {
    const blob = new Blob([tinyPngBytes()], { type: "image/webp" });
    const dataUrl = await fileToDataUrl(blob);
    expect(dataUrl.startsWith("data:image/webp;base64,")).toBe(true);
  });

  it("still produces a data URL for an untyped blob", async () => {
    const dataUrl = await fileToDataUrl(new Blob([tinyPngBytes()]));
    expect(isDataUrl(dataUrl)).toBe(true);
    expect(dataUrl.endsWith(TINY_PNG_BASE64)).toBe(true);
  });
});

describe("importImageFile", () => {
  it("refuses unsupported files before reading them and names the formats", async () => {
    await expect(importImageFile(makeFile("notes.txt", "text/plain"))).rejects.toThrow(/PNG, JPEG, GIF, WebP, BMP, SVG or AVIF/);
  });

  it("refuses an untyped file whose extension is not an image", async () => {
    await expect(importImageFile(makeFile("archive.zip", ""))).rejects.toThrow(/not a supported image/);
  });
});
