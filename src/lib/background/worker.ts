/**
 * Web worker that cuts the background out of pictures with a model running
 * in the browser. With graphics card access it runs on WebGPU, otherwise
 * on WebAssembly. It loads the model once, then handles one picture at a
 * time so the page stays responsive.
 * Everything here runs off the main thread: OffscreenCanvas does the
 * resizing and the final compose.
 */
import type * as OrtTypes from "onnxruntime-web";
import type { WorkerRequest, WorkerResponse } from "./messages";
import { loadModelBytes, MODEL, type ModelSpec } from "./model";
import { alphaToGreyPixels, applyAlpha, greyPixelsToAlpha, outputToAlpha, pixelsToTensor } from "./tensor";

type Ort = typeof OrtTypes;
type Backend = "webgpu" | "wasm";

/** The bits of the worker global we use, so this file needs no worker lib. */
interface WorkerScope {
  location: { origin: string };
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  navigator: { gpu?: { requestAdapter: () => Promise<unknown> } };
}

interface Engine {
  ort: Ort;
  session: OrtTypes.InferenceSession;
  spec: ModelSpec;
  backend: Backend;
}

const scope = self as unknown as WorkerScope;

let enginePromise: Promise<Engine> | null = null;
/** Set once WebGPU has failed on a picture, so later pictures use WebAssembly. */
let avoidWebGpu = false;
/** Jobs run one after another; this is the tail of the chain. */
let queue: Promise<void> = Promise.resolve();

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

/** WebGPU when the browser offers it to workers and an adapter answers. */
async function detectBackend(): Promise<Backend> {
  try {
    const gpu = scope.navigator.gpu;
    if (!gpu) return "wasm";
    return (await gpu.requestAdapter()) ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

/** Loads the runtime build for a backend. Each ships its own WebAssembly binary. */
async function loadRuntime(backend: Backend): Promise<Ort> {
  const ort = backend === "webgpu" ? await import("onnxruntime-web/webgpu") : await import("onnxruntime-web/wasm");
  // One thread: more would need cross origin isolation headers on the site.
  ort.env.wasm.numThreads = 1;
  return ort;
}

async function createEngine(backend: Backend): Promise<Engine> {
  const spec = MODEL;
  post({ type: "backend", backend });
  const ort = await loadRuntime(backend);
  const bytes = await loadModelBytes(spec, scope.location.origin, (loaded, total) => post({ type: "progress", id: null, phase: "download", loaded, total }));
  post({ type: "progress", id: null, phase: "load", loaded: 0, total: 0 });
  const session = await ort.InferenceSession.create(bytes, { executionProviders: backend === "webgpu" ? ["webgpu", "wasm"] : ["wasm"] });
  return { ort, session, spec, backend };
}

/**
 * Gets the model ready on first use. A graphics card that turns out not to
 * work falls back to WebAssembly. A failure clears the promise so a retry
 * can try again.
 */
function ensureEngine(): Promise<Engine> {
  enginePromise ??= (async () => {
    const backend = avoidWebGpu ? "wasm" : await detectBackend();
    if (backend === "wasm") return createEngine("wasm");
    try {
      return await createEngine("webgpu");
    } catch {
      return createEngine("wasm");
    }
  })().catch((error: unknown) => {
    enginePromise = null;
    throw error;
  });
  return enginePromise;
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
async function cutOut({ ort, session, spec }: Engine, bitmap: ImageBitmap): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = bitmap;
  const size = spec.inputSize;
  const small = rasterise(bitmap, size, size);
  const input = new ort.Tensor("float32", pixelsToTensor(small.data, size, spec.mean, spec.std), [1, 3, size, size]);
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

/**
 * Runs one picture. A graphics card that fails part way through is given
 * up on: the engine is rebuilt on WebAssembly and the picture tried again.
 */
async function process(id: number, bitmap: ImageBitmap): Promise<void> {
  const engine = await ensureEngine();
  post({ type: "progress", id, phase: "run", loaded: 0, total: 0 });
  try {
    const result = await cutOut(engine, bitmap);
    post({ type: "result", id, ...result });
  } catch (error) {
    if (engine.backend !== "webgpu" || avoidWebGpu) throw error;
    avoidWebGpu = true;
    enginePromise = null;
    await process(id, bitmap);
  }
}

async function handle(request: WorkerRequest): Promise<void> {
  const { id, bitmap } = request;
  try {
    await process(id, bitmap);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Background removal failed.";
    post({ type: "error", id, message });
  } finally {
    bitmap.close();
  }
}

scope.onmessage = (event) => {
  const request = event.data;
  if (request?.type !== "remove") return;
  queue = queue.then(() => handle(request));
};
