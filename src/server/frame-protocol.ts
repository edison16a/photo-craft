/**
 * Framing shared with scripts/background_remover.py.
 *
 * Requests are a 4 byte big endian length followed by the image bytes.
 * Responses are one status byte (0 ok, 1 error), a 4 byte big endian
 * length and the payload: a PNG on success, a UTF-8 message on error.
 */

export const STATUS_OK = 0;
export const STATUS_ERROR = 1;

/** Builds the bytes for one request frame. */
export function encodeRequest(image: Uint8Array): Uint8Array {
  const frame = new Uint8Array(4 + image.length);
  new DataView(frame.buffer).setUint32(0, image.length, false);
  frame.set(image, 4);
  return frame;
}

/** A parsed response frame. */
export interface ResponseFrame {
  status: number;
  payload: Uint8Array;
}

/**
 * Tries to read one complete response from the front of a buffer. Returns
 * the frame and how many bytes it used, or null while more bytes are needed.
 * The payload is a view into the buffer, not a copy.
 */
export function decodeResponse(buffer: Uint8Array): { frame: ResponseFrame; consumed: number } | null {
  if (buffer.length < 5) return null;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const status = view.getUint8(0);
  const length = view.getUint32(1, false);
  if (buffer.length < 5 + length) return null;
  return { frame: { status, payload: buffer.subarray(5, 5 + length) }, consumed: 5 + length };
}

/** Joins two byte arrays. */
export function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const joined = new Uint8Array(a.length + b.length);
  joined.set(a, 0);
  joined.set(b, a.length);
  return joined;
}
