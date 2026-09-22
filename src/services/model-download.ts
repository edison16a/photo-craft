/**
 * Downloads a cutout model into the browser's cache from the main thread,
 * so the settings can fetch a model the moment it is picked and show how
 * far along it is. The remover waits for a download that is under way
 * instead of starting a second one for the same model.
 */
import { loadModelBytes, MODELS, type ModelTier } from "../lib/background/model";

/** Called as the download goes along, with a fraction from 0 to 1. */
export type DownloadListener = (fraction: number) => void;

let inflight: { tier: ModelTier; promise: Promise<void> } | null = null;

/**
 * Fetches a model and stores it for later use. Resolves once the bytes
 * are in the cache. A second call for the same model while one is under
 * way shares that download. Rejects with a readable message on failure.
 */
export function downloadModel(tier: ModelTier, onProgress?: DownloadListener): Promise<void> {
  if (inflight?.tier === tier) return inflight.promise;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const promise = loadModelBytes(MODELS[tier], origin, (loaded, total) => onProgress?.(total > 0 ? loaded / total : 0))
    .then(() => undefined)
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { tier, promise };
  return promise;
}

/** The download under way for a model, or null when there is none. */
export function downloadInProgress(tier: ModelTier): Promise<void> | null {
  return inflight?.tier === tier ? inflight.promise : null;
}
