import { describe, it, expect } from "vitest";
import {
  extractDropPayload,
  extractImageSourcesFromHtml,
  looksLikeImageUrl,
} from "./drop-payload";

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";
const JPEG_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

/** The bare minimum of a DataTransfer: a file list and a getData lookup. */
function fakeTransfer(data: Record<string, string> = {}, files: File[] = []): DataTransfer {
  const types = [...Object.keys(data), ...(files.length > 0 ? ["Files"] : [])];
  return {
    files,
    types,
    getData: (type: string) => data[type] ?? "",
  } as unknown as DataTransfer;
}

function makeFile(name: string, type: string): File {
  return new File(["x"], name, { type });
}

describe("extractDropPayload", () => {
  it("returns an empty payload for null", () => {
    expect(extractDropPayload(null)).toEqual({ files: [], urls: [] });
  });

  it("keeps only image files and preserves their order", () => {
    const files = [
      makeFile("a.png", "image/png"),
      makeFile("notes.txt", "text/plain"),
      makeFile("b.jpg", "image/jpeg"),
      makeFile("unknown.bin", ""),
    ];
    const payload = extractDropPayload(fakeTransfer({}, files));
    expect(payload.files.map((file) => file.name)).toEqual(["a.png", "b.jpg"]);
    expect(payload.urls).toEqual([]);
  });

  it("reads urls from text/uri-list and skips comments and blank lines", () => {
    const uriList = [
      "# a comment",
      "https://a.example/one.png",
      "",
      "   https://b.example/two.jpg   ",
      "#another comment",
    ].join("\r\n");
    const payload = extractDropPayload(fakeTransfer({ "text/uri-list": uriList }));
    expect(payload.urls).toEqual(["https://a.example/one.png", "https://b.example/two.jpg"]);
  });

  it("reads img src values from a Google Images style html fragment", () => {
    const html =
      '<meta http-equiv="content-type" content="text/html; charset=utf-8">' +
      `<img src="${JPEG_DATA_URL}" alt="" class="rg_i" jsname="Q4LuWd">`;
    const payload = extractDropPayload(fakeTransfer({ "text/html": html }));
    expect(payload.urls).toEqual([JPEG_DATA_URL]);
  });

  it("uses text/plain only when the whole text is an image url or data url", () => {
    const link = extractDropPayload(fakeTransfer({ "text/plain": "https://a.example/x.png" }));
    expect(link.urls).toEqual(["https://a.example/x.png"]);

    const data = extractDropPayload(fakeTransfer({ "text/plain": `  ${PNG_DATA_URL}  ` }));
    expect(data.urls).toEqual([PNG_DATA_URL]);

    const words = extractDropPayload(fakeTransfer({ "text/plain": "just some words" }));
    expect(words.urls).toEqual([]);
  });

  it("collapses the same source repeated across entries into one url", () => {
    const payload = extractDropPayload(
      fakeTransfer({
        "text/uri-list": PNG_DATA_URL,
        "text/html": `<img src="${PNG_DATA_URL}">`,
        "text/plain": PNG_DATA_URL,
      }),
    );
    expect(payload.urls).toEqual([PNG_DATA_URL]);
  });

  it("orders urls as uri-list, then html, then plain text, first occurrence wins", () => {
    const payload = extractDropPayload(
      fakeTransfer({
        "text/uri-list": "https://a.example/1.png",
        "text/html": '<img src="https://b.example/2.png"><img src="https://a.example/1.png">',
        "text/plain": "https://c.example/3.png",
      }),
    );
    expect(payload.urls).toEqual([
      "https://a.example/1.png",
      "https://b.example/2.png",
      "https://c.example/3.png",
    ]);
  });

  it("returns both files and urls when an event carries both", () => {
    const payload = extractDropPayload(
      fakeTransfer({ "text/uri-list": "https://a.example/1.png" }, [makeFile("a.png", "image/png")]),
    );
    expect(payload.files).toHaveLength(1);
    expect(payload.urls).toEqual(["https://a.example/1.png"]);
  });

  it("drops file and javascript urls that a page could never load", () => {
    const payload = extractDropPayload(
      fakeTransfer(
        { "text/uri-list": "file:///home/me/a.png\r\njavascript:alert(1)\r\nhttps://a.example/ok.png" },
        [makeFile("a.png", "image/png")],
      ),
    );
    expect(payload.files.map((file) => file.name)).toEqual(["a.png"]);
    expect(payload.urls).toEqual(["https://a.example/ok.png"]);
  });

  it("tolerates getData throwing and a missing files list", () => {
    const throwing = {
      getData: () => {
        throw new Error("not allowed");
      },
    } as unknown as DataTransfer;
    expect(extractDropPayload(throwing)).toEqual({ files: [], urls: [] });

    const noFiles = { getData: () => "https://a.example/1.png" } as unknown as DataTransfer;
    expect(extractDropPayload(noFiles)).toEqual({ files: [], urls: ["https://a.example/1.png"] });
  });
});

describe("extractImageSourcesFromHtml", () => {
  it("returns nothing for empty html or html without images", () => {
    expect(extractImageSourcesFromHtml("")).toEqual([]);
    expect(extractImageSourcesFromHtml("   ")).toEqual([]);
    expect(extractImageSourcesFromHtml("<p>hello <a href='x.png'>link</a></p>")).toEqual([]);
  });

  it("returns every img src in document order, whatever the quoting", () => {
    const html = `<div><img src="https://a.example/1.png"><p><img src='${PNG_DATA_URL}' width=10></p></div>`;
    expect(extractImageSourcesFromHtml(html)).toEqual(["https://a.example/1.png", PNG_DATA_URL]);
  });

  it("skips images without a usable src and trims whitespace", () => {
    const html = '<img alt="no src"><img src=""><img src="  https://a.example/1.png  ">';
    expect(extractImageSourcesFromHtml(html)).toEqual(["https://a.example/1.png"]);
  });

  it("returns the src exactly as written rather than resolving it", () => {
    expect(extractImageSourcesFromHtml('<img src="/pics/a.png">')).toEqual(["/pics/a.png"]);
  });
});

describe("looksLikeImageUrl", () => {
  it("accepts http(s) urls and data image urls", () => {
    expect(looksLikeImageUrl("https://example.com/a.png")).toBe(true);
    expect(looksLikeImageUrl("http://example.com/a")).toBe(true);
    expect(looksLikeImageUrl("  https://example.com/a.png  ")).toBe(true);
    expect(looksLikeImageUrl(PNG_DATA_URL)).toBe(true);
    expect(looksLikeImageUrl("DATA:IMAGE/PNG;base64,abc")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(looksLikeImageUrl("")).toBe(false);
    expect(looksLikeImageUrl("hello")).toBe(false);
    expect(looksLikeImageUrl("example.com/a.png")).toBe(false);
    expect(looksLikeImageUrl("ftp://example.com/a.png")).toBe(false);
    expect(looksLikeImageUrl("data:text/plain,hi")).toBe(false);
    expect(looksLikeImageUrl("https://example.com/a.png and more")).toBe(false);
    expect(looksLikeImageUrl("javascript:alert(1)")).toBe(false);
  });
});
