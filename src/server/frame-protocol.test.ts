import { describe, expect, it } from "vitest";
import { concatBytes, decodeResponse, encodeRequest, STATUS_ERROR, STATUS_OK } from "./frame-protocol";

function response(status: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(5 + payload.length);
  frame[0] = status;
  new DataView(frame.buffer).setUint32(1, payload.length, false);
  frame.set(payload, 5);
  return frame;
}

describe("frame protocol", () => {
  it("prefixes a request with its big endian length", () => {
    const frame = encodeRequest(new Uint8Array([9, 8, 7]));
    expect([...frame]).toEqual([0, 0, 0, 3, 9, 8, 7]);
  });

  it("decodes a complete ok response and reports the bytes used", () => {
    const payload = new Uint8Array([1, 2, 3, 4]);
    const decoded = decodeResponse(concatBytes(response(STATUS_OK, payload), new Uint8Array([99])));
    expect(decoded?.consumed).toBe(9);
    expect(decoded?.frame.status).toBe(STATUS_OK);
    expect([...(decoded?.frame.payload ?? [])]).toEqual([1, 2, 3, 4]);
  });

  it("waits while the frame is incomplete", () => {
    const full = response(STATUS_ERROR, new TextEncoder().encode("bad image"));
    expect(decodeResponse(full.slice(0, 3))).toBeNull();
    expect(decodeResponse(full.slice(0, full.length - 1))).toBeNull();
    const decoded = decodeResponse(full);
    expect(new TextDecoder().decode(decoded?.frame.payload)).toBe("bad image");
  });

  it("decodes a zero length payload", () => {
    const decoded = decodeResponse(response(STATUS_OK, new Uint8Array()));
    expect(decoded?.consumed).toBe(5);
    expect(decoded?.frame.payload.length).toBe(0);
  });
});
