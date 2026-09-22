import { afterEach, describe, expect, it, vi } from "vitest";
import { STATUS_ERROR, STATUS_OK, type ResponseFrame } from "./frame-protocol";
import { FrameReader } from "./frame-reader";

function response(status: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(5 + payload.length);
  frame[0] = status;
  new DataView(frame.buffer).setUint32(1, payload.length, false);
  frame.set(payload, 5);
  return frame;
}

function pattern(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, index) => (index * 7 + 3) & 0xff);
}

/** Index of the first byte that differs, or -1 when both arrays match. */
function firstDifference(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return index;
  return -1;
}

/** Pushes bytes in pieces and asks for a frame after each one, like the worker's data handler. */
function feed(reader: FrameReader, bytes: Uint8Array, pieceSize: number): ResponseFrame | null {
  let frame: ResponseFrame | null = null;
  for (let start = 0; start < bytes.length && !frame; start += pieceSize) {
    reader.push(bytes.subarray(start, start + pieceSize));
    frame = reader.next();
  }
  return frame;
}

describe("FrameReader", () => {
  afterEach(() => vi.restoreAllMocks());

  it("waits until the whole frame is in, even when the header is split", () => {
    const reader = new FrameReader();
    const frame = response(STATUS_OK, pattern(20));
    for (let index = 0; index < frame.length - 1; index += 1) {
      reader.push(frame.subarray(index, index + 1));
      expect(reader.next()).toBeNull();
    }
    reader.push(frame.subarray(frame.length - 1));
    const decoded = reader.next();
    expect(decoded?.status).toBe(STATUS_OK);
    expect([...(decoded?.payload ?? [])]).toEqual([...pattern(20)]);
    expect(reader.size).toBe(0);
    expect(reader.next()).toBeNull();
  });

  it("rebuilds a large payload from many small chunks byte for byte", () => {
    const payload = pattern(300_000);
    const decoded = feed(new FrameReader(), response(STATUS_OK, payload), 7_001);
    expect(firstDifference(decoded?.payload ?? new Uint8Array(), payload)).toBe(-1);
  });

  it("splits frames that share a chunk and keeps the tail for the next one", () => {
    const reader = new FrameReader();
    const first = response(STATUS_ERROR, new TextEncoder().encode("bad image"));
    const second = response(STATUS_OK, pattern(9));
    const third = response(STATUS_OK, new Uint8Array());
    const all = new Uint8Array([...first, ...second, ...third]);
    reader.push(all.subarray(0, first.length + 8));
    expect(new TextDecoder().decode(reader.next()?.payload)).toBe("bad image");
    expect(reader.next()).toBeNull();
    reader.push(all.subarray(first.length + 8));
    expect([...(reader.next()?.payload ?? [])]).toEqual([...pattern(9)]);
    expect(reader.next()?.payload.length).toBe(0);
    expect(reader.size).toBe(0);
  });

  it("copies a reply about once, not once per chunk", () => {
    const frame = response(STATUS_OK, pattern(200 * 1024));
    const set = vi.spyOn(Uint8Array.prototype, "set");
    const decoded = feed(new FrameReader(), frame, 1024);
    let copied = 0;
    for (const [source] of set.mock.calls) copied += source.length;
    expect(decoded?.payload.length).toBe(200 * 1024);
    expect(copied).toBeLessThan(3 * frame.length);
  });
});
