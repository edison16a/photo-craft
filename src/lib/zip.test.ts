import { describe, it, expect } from "vitest";
import { crc32, createZipBlob, createZipBytes, type ZipEntry } from "./zip";

const encoder = new TextEncoder();
const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

function u16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint16(offset, true);
}

function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true);
}

function text(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder().decode(bytes.subarray(offset, offset + length));
}

function entry(name: string, content: string): ZipEntry {
  return { name, data: encoder.encode(content) };
}

describe("crc32", () => {
  it("matches the well known check value for 123456789", () => {
    expect(crc32(encoder.encode("123456789"))).toBe(0xcbf43926);
  });

  it("returns 0 for empty input", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("returns an unsigned value", () => {
    expect(crc32(encoder.encode("a"))).toBe(0xe8b7be43);
    expect(crc32(encoder.encode("a"))).toBeGreaterThanOrEqual(0);
  });
});

describe("createZipBytes with one entry", () => {
  const data = encoder.encode("hello");
  const bytes = createZipBytes([{ name: "a.txt", data }]);
  const localSize = 30 + 5 + data.length;
  const centralSize = 46 + 5;

  it("has the local header, central directory and EOCD signatures", () => {
    expect(u32(bytes, 0)).toBe(LOCAL_SIG);
    expect(u32(bytes, localSize)).toBe(CENTRAL_SIG);
    expect(u32(bytes, bytes.length - 22)).toBe(EOCD_SIG);
    expect(bytes.length).toBe(localSize + centralSize + 22);
  });

  it("writes store method, UTF-8 flag, crc and sizes in the local header", () => {
    expect(u16(bytes, 4)).toBe(20);
    expect(u16(bytes, 6) & 0x0800).toBe(0x0800);
    expect(u16(bytes, 8)).toBe(0);
    expect(u32(bytes, 14)).toBe(crc32(data));
    expect(u32(bytes, 18)).toBe(data.length);
    expect(u32(bytes, 22)).toBe(data.length);
    expect(u16(bytes, 26)).toBe(5);
    expect(u16(bytes, 28)).toBe(0);
    expect(text(bytes, 30, 5)).toBe("a.txt");
    expect(text(bytes, 35, data.length)).toBe("hello");
  });

  it("uses the same DOS date and time in both headers and a sane year", () => {
    const central = localSize;
    expect(u16(bytes, 10)).toBe(u16(bytes, central + 12));
    expect(u16(bytes, 12)).toBe(u16(bytes, central + 14));
    const year = (u16(bytes, 12) >> 9) + 1980;
    expect(year).toBe(new Date().getFullYear());
  });

  it("reports one entry and the right central directory size and offset", () => {
    const eocd = bytes.length - 22;
    expect(u16(bytes, eocd + 8)).toBe(1);
    expect(u16(bytes, eocd + 10)).toBe(1);
    expect(u32(bytes, eocd + 12)).toBe(centralSize);
    expect(u32(bytes, eocd + 16)).toBe(localSize);
    expect(u16(bytes, eocd + 20)).toBe(0);
  });
});

describe("createZipBytes with two entries", () => {
  const first = entry("one.txt", "first file");
  const second = entry("dir/two.txt", "second");
  const bytes = createZipBytes([first, second]);
  const firstLocal = 0;
  const secondLocal = 30 + first.name.length + first.data.length;
  const centralStart = secondLocal + 30 + second.name.length + second.data.length;
  const secondCentral = centralStart + 46 + first.name.length;
  const eocd = secondCentral + 46 + second.name.length;

  it("lays entries out back to back in the order given", () => {
    expect(u32(bytes, firstLocal)).toBe(LOCAL_SIG);
    expect(text(bytes, firstLocal + 30, 7)).toBe("one.txt");
    expect(text(bytes, firstLocal + 37, 10)).toBe("first file");
    expect(u32(bytes, secondLocal)).toBe(LOCAL_SIG);
    expect(text(bytes, secondLocal + 30, 11)).toBe("dir/two.txt");
    expect(text(bytes, secondLocal + 41, 6)).toBe("second");
  });

  it("writes one central header per entry pointing at its local header", () => {
    expect(u32(bytes, centralStart)).toBe(CENTRAL_SIG);
    expect(u32(bytes, centralStart + 42)).toBe(firstLocal);
    expect(u32(bytes, centralStart + 16)).toBe(crc32(first.data));
    expect(text(bytes, centralStart + 46, 7)).toBe("one.txt");
    expect(u32(bytes, secondCentral)).toBe(CENTRAL_SIG);
    expect(u32(bytes, secondCentral + 42)).toBe(secondLocal);
    expect(u32(bytes, secondCentral + 16)).toBe(crc32(second.data));
    expect(u32(bytes, secondCentral + 24)).toBe(second.data.length);
    expect(text(bytes, secondCentral + 46, 11)).toBe("dir/two.txt");
  });

  it("ends with an EOCD that counts both entries", () => {
    expect(u32(bytes, eocd)).toBe(EOCD_SIG);
    expect(u16(bytes, eocd + 8)).toBe(2);
    expect(u16(bytes, eocd + 10)).toBe(2);
    expect(u32(bytes, eocd + 12)).toBe(eocd - centralStart);
    expect(u32(bytes, eocd + 16)).toBe(centralStart);
    expect(bytes.length).toBe(eocd + 22);
  });
});

describe("createZipBytes edge cases", () => {
  it("encodes non ASCII names as UTF-8 and sets bit 11", () => {
    const name = "página ünïcode.png";
    const nameBytes = encoder.encode(name);
    const bytes = createZipBytes([{ name, data: new Uint8Array([1, 2, 3]) }]);
    expect(u16(bytes, 6) & 0x0800).toBe(0x0800);
    expect(u16(bytes, 26)).toBe(nameBytes.length);
    expect(text(bytes, 30, nameBytes.length)).toBe(name);
  });

  it("produces a 22 byte archive for no entries", () => {
    const bytes = createZipBytes([]);
    expect(bytes.length).toBe(22);
    expect(u32(bytes, 0)).toBe(EOCD_SIG);
    expect(u16(bytes, 10)).toBe(0);
    expect(u32(bytes, 16)).toBe(0);
  });

  it("rejects entries without a name", () => {
    expect(() => createZipBytes([{ name: "", data: new Uint8Array(1) }])).toThrow(
      /name/,
    );
  });

  it("rejects more entries than the classic format allows", () => {
    const data = new Uint8Array(0);
    const entries: ZipEntry[] = Array.from({ length: 65536 }, (_, i) => ({
      name: `f${i}`,
      data,
    }));
    expect(() => createZipBytes(entries)).toThrow(/65535/);
  });
});

describe("createZipBlob", () => {
  it("wraps the same bytes in an application/zip Blob", () => {
    const entries = [entry("a.txt", "abc"), entry("b.txt", "defg")];
    const blob = createZipBlob(entries);
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBe(createZipBytes(entries).length);
  });
});
