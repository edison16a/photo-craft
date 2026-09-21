import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dataUrlToBlob,
  dataUrlToBytes,
  downloadBlob,
  downloadDataUrl,
  safeFilename,
} from "./download";

/** A 1x1 transparent PNG. The byte length is derived so the constant cannot drift from the payload. */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;
const TINY_PNG_BYTE_LENGTH = atob(TINY_PNG_BASE64).length;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("dataUrlToBlob", () => {
  it("keeps the media type from the header", () => {
    const blob = dataUrlToBlob(TINY_PNG_DATA_URL);
    expect(blob.type).toBe("image/png");
  });

  it("decodes base64 to the right number of bytes", () => {
    const blob = dataUrlToBlob(TINY_PNG_DATA_URL);
    expect(blob.size).toBe(TINY_PNG_BYTE_LENGTH);
  });

  it("handles a jpeg header the same way", () => {
    const blob = dataUrlToBlob("data:image/jpeg;base64,/9j/4AAQ");
    expect(blob.type).toBe("image/jpeg");
    expect(blob.size).toBe(6);
  });

  it("decodes the percent encoded text form", () => {
    const blob = dataUrlToBlob("data:text/plain,hello%20world");
    expect(blob.type).toBe("text/plain");
    expect(blob.size).toBe("hello world".length);
  });

  it("falls back to text/plain when the header has no type", () => {
    const blob = dataUrlToBlob("data:,abc");
    expect(blob.type).toBe("text/plain");
    expect(blob.size).toBe(3);
  });

  it("throws a readable error for input that is not a data URL", () => {
    expect(() => dataUrlToBlob("https://example.com/a.png")).toThrow(/data URL/);
    expect(() => dataUrlToBlob("")).toThrow(/data URL/);
  });

  it("throws a readable error for broken base64", () => {
    expect(() => dataUrlToBlob("data:image/png;base64,***")).toThrow(/base64/);
  });
});

describe("dataUrlToBytes", () => {
  it("returns the decoded bytes starting with the png signature", () => {
    const bytes = dataUrlToBytes(TINY_PNG_DATA_URL);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(TINY_PNG_BYTE_LENGTH);
    expect(Array.from(bytes.slice(0, PNG_SIGNATURE.length))).toEqual(PNG_SIGNATURE);
  });

  it("tolerates whitespace inside the base64 payload", () => {
    const wrapped = `data:image/png;base64,${TINY_PNG_BASE64.slice(0, 20)}\n${TINY_PNG_BASE64.slice(20)}`;
    expect(dataUrlToBytes(wrapped).length).toBe(TINY_PNG_BYTE_LENGTH);
  });

  it("encodes percent encoded text as utf-8", () => {
    const bytes = dataUrlToBytes("data:text/plain,%C3%A9");
    expect(Array.from(bytes)).toEqual([0xc3, 0xa9]);
  });
});

describe("safeFilename", () => {
  it("collapses whitespace to single dashes", () => {
    expect(safeFilename("My  cool   design")).toBe("My-cool-design");
  });

  it("strips characters that are illegal in filenames", () => {
    expect(safeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("abcdefghij");
  });

  it("removes control characters", () => {
    expect(safeFilename("tab\there\u0000null")).toBe("tab-herenull");
  });

  it("trims dots, dashes and spaces off the ends", () => {
    expect(safeFilename("  --.hello.--  ")).toBe("hello");
  });

  it("keeps an extension and inner dots alone", () => {
    expect(safeFilename("poster.v2.png")).toBe("poster.v2.png");
  });

  it("cuts long names to 80 characters", () => {
    const long = "x".repeat(200);
    expect(safeFilename(long)).toBe("x".repeat(80));
    expect(safeFilename(long).length).toBe(80);
  });

  it("does not end with a dash after cutting", () => {
    const name = "a".repeat(79) + " " + "b".repeat(20);
    expect(safeFilename(name)).toBe("a".repeat(79));
  });

  it("does not split an emoji sitting on the cut", () => {
    const smile = "\u{1F600}";
    const result = safeFilename("a".repeat(79) + smile + smile);
    expect(result).toBe("a".repeat(79) + smile);
    expect(Array.from(result)).toHaveLength(80);
  });

  it("collapses dashes left behind by removed characters", () => {
    expect(safeFilename("a / b")).toBe("a-b");
    expect(safeFilename("one ? two")).toBe("one-two");
  });

  it("falls back to untitled when nothing is left", () => {
    expect(safeFilename("")).toBe("untitled");
    expect(safeFilename("   ")).toBe("untitled");
    expect(safeFilename("???")).toBe("untitled");
  });

  it("uses the given fallback when nothing is left", () => {
    expect(safeFilename("///", "page")).toBe("page");
  });

  it("still returns untitled when the fallback is blank", () => {
    expect(safeFilename("", "   ")).toBe("untitled");
  });

  it("leaves unicode letters alone", () => {
    expect(safeFilename("café résumé")).toBe("café-résumé");
  });
});

describe("downloadBlob", () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clicks an anchor pointing at an object URL and revokes it later", () => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => "blob:fake-url");
    URL.revokeObjectURL = vi.fn();
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    downloadBlob(new Blob(["hi"], { type: "text/plain" }), "note.txt");

    expect(clicked).toHaveLength(1);
    expect(clicked[0].href).toBe("blob:fake-url");
    expect(clicked[0].download).toBe("note.txt");
    expect(document.body.contains(clicked[0])).toBe(false);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("downloadDataUrl hands a Blob of the right type to the download", () => {
    const create = vi.fn<(source: Blob | MediaSource) => string>(() => "blob:fake-url");
    URL.createObjectURL = create;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadDataUrl(TINY_PNG_DATA_URL, "page.png");

    expect(create).toHaveBeenCalledTimes(1);
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(TINY_PNG_BYTE_LENGTH);
  });
});
