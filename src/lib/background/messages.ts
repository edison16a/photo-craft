/**
 * Messages between the page and the background removal worker. Kept in
 * one file so both sides agree on the shape of every message.
 */

/** Where the worker is in getting ready or in doing a job. */
export type RemovalPhase = "download" | "load" | "run";

/** A picture to cut out. The bitmap is transferred, not copied. */
export interface RemoveRequest {
  type: "remove";
  id: number;
  bitmap: ImageBitmap;
}

/** Progress on a job, or on the one time model download when id is null. */
export interface ProgressMessage {
  type: "progress";
  id: number | null;
  phase: RemovalPhase;
  /** Bytes so far for a download, otherwise 0. */
  loaded: number;
  /** Bytes in total for a download, otherwise 0 when unknown. */
  total: number;
}

/** The finished cutout as a PNG with transparency. */
export interface ResultMessage {
  type: "result";
  id: number;
  blob: Blob;
  width: number;
  height: number;
}

/** Something went wrong. With an id the job failed; without one the worker itself did. */
export interface ErrorMessage {
  type: "error";
  id: number | null;
  message: string;
}

export type WorkerRequest = RemoveRequest;
export type WorkerResponse = ProgressMessage | ResultMessage | ErrorMessage;
