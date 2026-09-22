/**
 * Messages between the page and the background removal worker. Kept in
 * one file so both sides agree on the shape of every message.
 */

/** Where the worker is in getting ready or in doing a job. */
export type RemovalPhase = "download" | "load" | "run";

import type { ModelTier } from "./model";

/** A picture to cut out with the chosen model. The bitmap is transferred, not copied. */
export interface RemoveRequest {
  type: "remove";
  id: number;
  bitmap: ImageBitmap;
  tier: ModelTier;
}

/** Drop the loaded model, for example after it was deleted from the computer. */
export interface ForgetRequest {
  type: "forget";
}

/** Which engine the worker settled on, sent once before the first download. */
export interface BackendMessage {
  type: "backend";
  backend: "webgpu" | "wasm";
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

export type WorkerRequest = RemoveRequest | ForgetRequest;
export type WorkerResponse = BackendMessage | ProgressMessage | ResultMessage | ErrorMessage;
