/**
 * The cutout models and how their bytes get into memory. Three models ship
 * with the site, from a small quick one to the best one, which is stored
 * in parts so no file is bigger than GitHub allows. Whichever is chosen,
 * the first use downloads it once and keeps a joined copy in the
 * browser's cache storage, from where it can also be deleted again.
 */

/** The three models, from smallest to best. */
export type ModelTier = "light" | "effective" | "best";

/** Everything the worker and the settings page need to know about a model. */
export interface ModelSpec {
  tier: ModelTier;
  /** What the settings page calls it. */
  label: string;
  /** One line on what to expect from it. */
  blurb: string;
  /** File name without the part suffix, also the cache key. */
  name: string;
  /** Files that make up the model, in order. Fetched together and joined. */
  parts: string[];
  /** Total size in bytes, for the progress figure before any part answers. */
  bytes: number;
  /** The square the model takes as input, in pixels. */
  inputSize: number;
  /** Per channel offsets subtracted from RGB fractions. */
  mean: [number, number, number];
  /** Per channel divisors applied after the offset. */
  std: [number, number, number];
}

const IMAGENET_MEAN: [number, number, number] = [0.485, 0.456, 0.406];
const IMAGENET_STD: [number, number, number] = [0.229, 0.224, 0.225];

/** The models in the order the settings page lists them. */
export const MODEL_TIERS: ModelTier[] = ["light", "effective", "best"];

/** What a fresh install uses. */
export const DEFAULT_TIER: ModelTier = "best";

export const MODELS: Record<ModelTier, ModelSpec> = {
  light: {
    tier: "light",
    label: "Light",
    blurb: "5 MB. Quick on any computer. Rough around hair and fine edges.",
    name: "u2netp",
    parts: ["/models/u2netp.onnx"],
    bytes: 4574861,
    inputSize: 320,
    mean: IMAGENET_MEAN,
    std: IMAGENET_STD,
  },
  effective: {
    tier: "effective",
    label: "Effective",
    blurb: "44 MB. Good cutouts in a few seconds.",
    name: "silueta",
    parts: ["/models/silueta.onnx"],
    bytes: 44173029,
    inputSize: 320,
    mean: IMAGENET_MEAN,
    std: IMAGENET_STD,
  },
  best: {
    tier: "best",
    label: "Best",
    blurb: "179 MB. The cleanest edges. Quick with a graphics card, slower without.",
    name: "isnet-general-use",
    parts: [0, 1, 2, 3].map((index) => `/models/isnet-general-use.onnx.${index}`),
    bytes: 178648008,
    inputSize: 1024,
    mean: IMAGENET_MEAN,
    std: [1, 1, 1],
  },
};

/** True for a string that names one of the tiers. */
export function isModelTier(value: unknown): value is ModelTier {
  return value === "light" || value === "effective" || value === "best";
}

/** Cache storage bucket that holds the models. Bump the name to force a refetch. */
const CACHE_NAME = "photo-craft-models-v2";

/** Called as bytes arrive, with the running total across every part. */
export type DownloadProgress = (loaded: number, total: number) => void;

/** The address a model's joined bytes are cached under. */
function cacheKey(spec: ModelSpec, origin: string): string {
  return `${origin}/models/${spec.name}.onnx`;
}

/** Opens the model cache, or undefined where cache storage is missing or refused. */
async function openCache(): Promise<Cache | undefined> {
  if (typeof caches === "undefined") return undefined;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    // Some private windows refuse storage. The download still works.
    return undefined;
  }
}

/** Reads a response body to the end, reporting each chunk as it lands. */
async function readChunks(response: Response, onChunk: (bytes: number) => void): Promise<Uint8Array<ArrayBuffer>[]> {
  if (!response.body) {
    const whole = new Uint8Array(await response.arrayBuffer());
    onChunk(whole.length);
    return [whole];
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as Uint8Array<ArrayBuffer>);
    onChunk(value.length);
  }
  return chunks;
}

/** Fetches one part, throwing a readable message when it cannot be had. */
async function fetchPart(url: string, onChunk: (bytes: number) => void): Promise<Uint8Array<ArrayBuffer>[]> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Could not download the cutout model. Check your connection and try again.");
  }
  if (!response.ok) throw new Error(`Could not download the cutout model (${response.status}).`);
  return readChunks(response, onChunk);
}

/** Joins chunks into one buffer. */
function join(chunkLists: Uint8Array<ArrayBuffer>[][]): Uint8Array<ArrayBuffer> {
  const total = chunkLists.flat().reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunkLists.flat()) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/**
 * Returns the model bytes, from the cache when they are there and from
 * the network otherwise. Parts download side by side and are joined. A
 * network copy is stored, joined, for next time before it is returned.
 */
export async function loadModelBytes(spec: ModelSpec, origin: string, onProgress: DownloadProgress): Promise<Uint8Array<ArrayBuffer>> {
  const key = cacheKey(spec, origin);
  const cache = await openCache();
  const cached = await cache?.match(key);
  if (cached) {
    const bytes = new Uint8Array(await cached.arrayBuffer());
    onProgress(bytes.length, bytes.length);
    return bytes;
  }
  let loaded = 0;
  const onChunk = (count: number) => {
    loaded += count;
    onProgress(loaded, spec.bytes);
  };
  const chunkLists = await Promise.all(spec.parts.map((part) => fetchPart(new URL(part, origin).href, onChunk)));
  const bytes = join(chunkLists);
  try {
    await cache?.put(key, new Response(bytes, { headers: { "content-type": "application/octet-stream" } }));
  } catch {
    // Out of quota or refused. Next visit downloads again, which is fine.
  }
  return bytes;
}

/** Whether a model's bytes are on this computer. */
export async function isModelCached(tier: ModelTier, origin: string): Promise<boolean> {
  const cache = await openCache();
  return Boolean(await cache?.match(cacheKey(MODELS[tier], origin)));
}

/** Removes a model's bytes from this computer. True when something was deleted. */
export async function deleteModelBytes(tier: ModelTier, origin: string): Promise<boolean> {
  const cache = await openCache();
  return Boolean(await cache?.delete(cacheKey(MODELS[tier], origin)));
}
