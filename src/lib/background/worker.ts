/**
 * Web worker that cuts the background out of pictures with the silueta
 * model running on WebAssembly. It loads the model once, then handles
 * one picture at a time so the page stays responsive while it works.
 * Everything here runs off the main thread: OffscreenCanvas does the
 * resizing and the final compose.
 */
import * as ort from "onnxruntime-web/wasm";
import type { RemovalPhase, WorkerRequest, WorkerResponse } from "./messages";
import { loadModelBytes, MODEL_PATH } from "./model";
import { alphaToGreyPixels, applyAlpha, greyPixelsToAlpha, MODEL_INPUT_SIZE, outputToAlpha, pixelsToTensor } from "./tensor";

/** The bits of the worker global we use, so this file needs no worker lib. */
interface WorkerScope {
  location: { origin: string };
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

// One thread: more would need cross origin isolation headers on the site.
// The WebAssembly binary ships in the bundle, so no path is needed here.
ort.env.wasm.numThreads = 1;

let sessionPromise: Promise<ort.InferenceSession> | null = null;
/** Jobs run one after another; this is the tail of the chain. */
let queue: Promise<void> = Promise.resolve();

function report(id: number | null, phase: RemovalPhase, loaded = 0, total = 0): void {
  scope.postMessage({ type: "progress", id, phase, loaded, total });
}

/** Loads the model on first use. A failure clears the promise so a retry can try again. */
function ensureSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= (async () => {
    const bytes = await loadModelBytes(new URL(MODEL_PATH, scope.location.origin).href, (loaded, total) =>
      report(null, "download", loaded, total),
    );
    report(null, "load");
    return ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
  })().catch((error: unknown) => {
    sessionPromise = null;
    throw error;
  });
  return sessionPromise;
}

/** Draws a source onto a fresh canvas of the given size and returns the pixels. */
function rasterise(source: CanvasImageSource, width: number, height: number): ImageData {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot draw pictures in a worker.");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

/** Runs the model and returns the cutout as a PNG at the picture's own size. */
async function cutOut(session: ort.InferenceSession, bitmap: ImageBitmap): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = bitmap;
  const size = MODEL_INPUT_SIZE;
  const small = rasterise(bitmap, size, size);
  const input = new ort.Tensor("float32", pixelsToTensor(small.data, size), [1, 3, size, size]);
  const results = await session.run({ [session.inputNames[0]]: input });
  const output = results[session.outputNames[0]].data as Float32Array;

  // Scale the small mask up to the picture with the canvas's own filtering.
  const maskCanvas = new OffscreenCanvas(size, size);
  const maskContext = maskCanvas.getContext("2d");
  if (!maskContext) throw new Error("This browser cannot draw pictures in a worker.");
  maskContext.putImageData(new ImageData(alphaToGreyPixels(outputToAlpha(output, size)), size, size), 0, 0);
  const alpha = greyPixelsToAlpha(rasterise(maskCanvas, width, height).data);

  const picture = rasterise(bitmap, width, height);
  applyAlpha(picture.data, alpha);
  const outCanvas = new OffscreenCanvas(width, height);
  const outContext = outCanvas.getContext("2d");
  if (!outContext) throw new Error("This browser cannot draw pictures in a worker.");
  outContext.putImageData(picture, 0, 0);
  const blob = await outCanvas.convertToBlob({ type: "image/png" });
  return { blob, width, height };
}

async function handle(request: WorkerRequest): Promise<void> {
  const { id, bitmap } = request;
  try {
    const session = await ensureSession();
    report(id, "run");
    const result = await cutOut(session, bitmap);
    scope.postMessage({ type: "result", id, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Background removal failed.";
    scope.postMessage({ type: "error", id, message });
  } finally {
    bitmap.close();
  }
}

scope.onmessage = (event) => {
  const request = event.data;
  if (request?.type !== "remove") return;
  queue = queue.then(() => handle(request));
};
