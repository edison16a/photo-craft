/**
 * Client side of the background remover. Talks to the API route, which
 * runs the Python worker on the server.
 */
import { dataUrlToBlob } from "../lib/download";
import { fileToDataUrl, loadHtmlImage, type LoadedImage } from "../lib/image-loading";

/** What the server said about the remover. */
export interface BackgroundRemovalStatus {
  available: boolean;
  reason?: string;
  model?: string;
}

export const BACKGROUND_REMOVAL_ENDPOINT = "/api/background-removal";

/** Pulls the error message out of a failed JSON response, or falls back to the status. */
async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // Not JSON. The status line will have to do.
  }
  return `Background removal failed (${response.status}).`;
}

/** Asks the server whether Python and rembg are set up. */
export async function fetchBackgroundRemovalStatus(fetchImpl: typeof fetch = fetch): Promise<BackgroundRemovalStatus> {
  try {
    const response = await fetchImpl(BACKGROUND_REMOVAL_ENDPOINT, { cache: "no-store" });
    if (!response.ok) return { available: false, reason: await readError(response) };
    return (await response.json()) as BackgroundRemovalStatus;
  } catch {
    return { available: false, reason: "Could not reach the server." };
  }
}

/** Sends an image data URL to the server and returns the cut out as a new data URL. */
export async function removeImageBackground(dataUrl: string, fetchImpl: typeof fetch = fetch): Promise<LoadedImage> {
  const blob = dataUrlToBlob(dataUrl);
  const response = await fetchImpl(BACKGROUND_REMOVAL_ENDPOINT, {
    method: "POST",
    headers: { "content-type": blob.type || "image/png" },
    body: blob,
  });
  if (!response.ok) throw new Error(await readError(response));
  const src = await fileToDataUrl(await response.blob());
  const image = await loadHtmlImage(src);
  return { src, width: image.naturalWidth, height: image.naturalHeight };
}
