/**
 * Getting the cutout model's bytes into memory. The model ships with the
 * site as a static file. The first visit downloads it once and keeps a
 * copy in the browser's cache storage, so later visits and later pages
 * read it from disk instead of the network.
 */

/** Where the site serves the model. Relative to the origin. */
export const MODEL_PATH = "/models/silueta.onnx";

/** Cache storage bucket that holds the model. Bump the name to force a refetch. */
const CACHE_NAME = "photo-craft-models-v1";

/** Called as bytes arrive. Total is 0 when the server did not say. */
export type DownloadProgress = (loaded: number, total: number) => void;

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

/** Reads a response body to the end while reporting how much has arrived. */
async function readWithProgress(response: Response, onProgress: DownloadProgress): Promise<Uint8Array<ArrayBuffer>> {
  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress(bytes.length, bytes.length);
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, total);
  }
  const bytes = new Uint8Array(new ArrayBuffer(loaded));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/**
 * Returns the model bytes, from the cache when they are there and from
 * the network otherwise. A network copy is stored for next time before
 * it is returned. Throws with a readable message when the file cannot be
 * fetched, for example when the site is offline on a first visit.
 */
export async function loadModelBytes(url: string, onProgress: DownloadProgress): Promise<Uint8Array<ArrayBuffer>> {
  const cache = await openCache();
  const cached = await cache?.match(url);
  if (cached) {
    const bytes = new Uint8Array(await cached.arrayBuffer());
    onProgress(bytes.length, bytes.length);
    return bytes;
  }
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Could not download the cutout model. Check your connection and try again.");
  }
  if (!response.ok) throw new Error(`Could not download the cutout model (${response.status}).`);
  const bytes = await readWithProgress(response, onProgress);
  try {
    await cache?.put(url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } }));
  } catch {
    // Out of quota or refused. Next visit downloads again, which is fine.
  }
  return bytes;
}
