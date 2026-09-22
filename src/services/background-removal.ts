/**
 * Main thread side of the background remover. Starts the worker on first
 * use, hands it pictures one by one and resolves each caller's promise
 * when its cutout comes back. Progress, and which model ended up in use,
 * go to the removal progress store so any button or panel can show them.
 */
import { fileToDataUrl, type LoadedImage } from "../lib/image-loading";
import { dataUrlToBlob } from "../lib/download";
import type { WorkerRequest, WorkerResponse } from "../lib/background/messages";
import { useRemovalProgressStore } from "../store/removal-progress-store";
import { useSettingsUiStore } from "../store/settings-ui-store";
import { loadSettings } from "./settings";

/** A finished cutout: a PNG with transparency at the picture's own size. */
export interface CutOut {
  blob: Blob;
  width: number;
  height: number;
}

interface PendingJob {
  resolve: (result: CutOut) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextId = 1;
const jobs = new Map<number, PendingJob>();

/** True when this browser has everything the remover needs. */
export function isBackgroundRemovalSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap === "function" &&
    typeof WebAssembly !== "undefined"
  );
}

/** Fails every waiting job, for when the worker itself dies. */
function failAll(message: string): void {
  const progress = useRemovalProgressStore.getState();
  for (const [id, job] of jobs) {
    job.reject(new Error(message));
    progress.removePending(id);
  }
  jobs.clear();
  progress.setPhase(null);
}

function onMessage(event: MessageEvent<WorkerResponse>): void {
  const message = event.data;
  const progress = useRemovalProgressStore.getState();
  if (message.type === "backend") {
    progress.setBackend(message.backend);
    return;
  }
  if (message.type === "progress") {
    progress.setPhase(message.phase, message.loaded, message.total);
    return;
  }
  const job = jobs.get(message.id ?? -1);
  if (message.type === "error" && message.id === null) {
    failAll(message.message);
    return;
  }
  if (message.id !== null) {
    jobs.delete(message.id);
    progress.removePending(message.id);
  }
  if (jobs.size === 0) progress.setPhase(null);
  if (!job) return;
  if (message.type === "result") {
    progress.setReady();
    job.resolve({ blob: message.blob, width: message.width, height: message.height });
  } else {
    job.reject(new Error(message.message));
  }
}

/** The one worker, created on first use. */
function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../lib/background/worker.ts", import.meta.url));
  worker.onmessage = onMessage;
  worker.onerror = (event) => {
    failAll(event.message || "The background remover stopped unexpectedly.");
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/**
 * Cuts the background out of a picture. Jobs queue up and run one at a
 * time. Rejects with a readable message when the browser cannot run the
 * remover, when the model cannot be downloaded or when the picture cannot
 * be decoded.
 */
export async function removeBackground(source: Blob | ImageBitmap): Promise<CutOut> {
  if (!isBackgroundRemovalSupported()) {
    throw new Error("This browser cannot run the background remover. Try a current Chrome, Edge, Firefox or Safari.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = source instanceof Blob ? await createImageBitmap(source) : source;
  } catch {
    throw new Error("That picture could not be read.");
  }
  const id = nextId++;
  const progress = useRemovalProgressStore.getState();
  progress.addPending(id);
  // The first ever use points at the settings, where the model can be changed.
  useSettingsUiStore.getState().showModelHint();
  return new Promise<CutOut>((resolve, reject) => {
    jobs.set(id, { resolve, reject });
    const request: WorkerRequest = { type: "remove", id, bitmap, tier: loadSettings().backgroundModel };
    getWorker().postMessage(request, [bitmap]);
  });
}

/** Drops the model held in memory, so the next picture loads the chosen one afresh. */
export function forgetLoadedModel(): void {
  const request: WorkerRequest = { type: "forget" };
  worker?.postMessage(request);
  useRemovalProgressStore.setState({ ready: false });
}

/** Cuts out a data URL picture and returns the result as a data URL, for the editor. */
export async function removeBackgroundFromDataUrl(dataUrl: string): Promise<LoadedImage> {
  const result = await removeBackground(dataUrlToBlob(dataUrl));
  return { src: await fileToDataUrl(result.blob), width: result.width, height: result.height };
}
