/**
 * Puts response frames back together from the pieces a pipe delivers.
 *
 * A pipe hands over a big reply in 64 KB reads. Joining everything after
 * each read copies the whole reply again every time, which is quadratic in
 * the reply size and stalls the event loop for a large PNG. So the pieces
 * stay in a list and are joined once, when the header says the frame is
 * complete. Only the 5 byte header is looked at before that.
 */
import { decodeResponse, type ResponseFrame } from "./frame-protocol";

const HEADER_SIZE = 5;

/** Collects stream chunks and hands back complete frames in order. */
export class FrameReader {
  private chunks: Uint8Array[] = [];
  private buffered = 0;

  /** Adds the bytes from one read. The chunk is kept, not copied. */
  push(chunk: Uint8Array): void {
    if (chunk.length === 0) return;
    this.chunks.push(chunk);
    this.buffered += chunk.length;
  }

  /** Bytes waiting that have not been handed out as a frame yet. */
  get size(): number {
    return this.buffered;
  }

  /** Takes the next complete frame off the front, or returns null while bytes are missing. */
  next(): ResponseFrame | null {
    if (this.buffered < HEADER_SIZE) return null;
    const header = this.join(HEADER_SIZE, false);
    const length = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(1, false);
    if (this.buffered < HEADER_SIZE + length) return null;
    const decoded = decodeResponse(this.join(HEADER_SIZE + length, true));
    return decoded ? decoded.frame : null;
  }

  /** Copies the first count bytes into one array. With drop, those bytes leave the list. */
  private join(count: number, drop: boolean): Uint8Array {
    const out = new Uint8Array(count);
    let copied = 0;
    let used = 0;
    while (copied < count) {
      const chunk = this.chunks[used];
      const wanted = Math.min(count - copied, chunk.length);
      out.set(chunk.subarray(0, wanted), copied);
      copied += wanted;
      if (wanted === chunk.length) used += 1;
      else if (drop) this.chunks[used] = chunk.subarray(wanted);
    }
    if (drop) {
      this.chunks.splice(0, used);
      this.buffered -= count;
    }
    return out;
  }
}
