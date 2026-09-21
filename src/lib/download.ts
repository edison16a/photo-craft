/**
 * Getting bytes out of the browser and onto the user's disk. Exports produce
 * data URLs (from canvas.toDataURL) or Blobs (from the zip writer), and this
 * module turns either into a real file download. It also cleans up project
 * names so they are safe to use as filenames on every operating system.
 *
 * Only downloadBlob and downloadDataUrl touch the DOM. The conversion and
 * filename helpers are pure and run anywhere.
 */

/** Longest filename safeFilename will hand back, not counting an extension the caller adds later. */
const MAX_FILENAME_LENGTH = 80;

/** Name used when nothing usable is left after cleaning and no fallback was given. */
const DEFAULT_FILENAME = "untitled";

/**
 * How long to wait before revoking the object URL behind a download.
 * The click starts the download asynchronously, and Firefox in particular
 * can lose a large file if the URL disappears too soon, so one second is
 * safer than a bare zero delay.
 */
const REVOKE_DELAY_MS = 1000;

/**
 * Characters that are illegal in filenames on Windows, macOS or Linux, plus
 * control characters. Windows is the strictest so its list covers the rest.
 */
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

/** Media type a data URL means when its header leaves the type out, per RFC 2397. */
const DEFAULT_DATA_URL_TYPE = "text/plain";

/** What a data URL breaks down into once the header has been read. */
interface DecodedDataUrl {
  type: string;
  bytes: Uint8Array<ArrayBuffer>;
}

/**
 * Splits a data URL into its media type and raw bytes. Handles both the
 * base64 form that canvases produce and the percent encoded text form.
 * Throws a readable Error for anything that is not a data URL or whose
 * payload cannot be decoded.
 */
function decodeDataUrl(dataUrl: string): DecodedDataUrl {
  const commaIndex = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || commaIndex < 0) {
    throw new Error("Expected a data URL of the form data:<type>;base64,<payload>.");
  }

  const header = dataUrl.slice("data:".length, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  const headerParts = header.split(";").map((part) => part.trim());
  const type = headerParts[0] || DEFAULT_DATA_URL_TYPE;
  const isBase64 = headerParts.slice(1).some((part) => part.toLowerCase() === "base64");

  return { type, bytes: isBase64 ? decodeBase64(payload) : decodePercentEncoded(payload) };
}

/** Turns a base64 payload into bytes. Whitespace is tolerated since some tools wrap long lines. */
function decodeBase64(payload: string): Uint8Array<ArrayBuffer> {
  let binary: string;
  try {
    binary = atob(payload.replace(/\s+/g, ""));
  } catch {
    throw new Error("The data URL payload is not valid base64.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Turns a percent encoded text payload into UTF-8 bytes. */
function decodePercentEncoded(payload: string): Uint8Array<ArrayBuffer> {
  let text: string;
  try {
    text = decodeURIComponent(payload);
  } catch {
    throw new Error("The data URL payload has a broken percent encoding.");
  }
  const encoded = new TextEncoder().encode(text);
  const bytes = new Uint8Array(encoded.length);
  bytes.set(encoded);
  return bytes;
}

/**
 * Converts a data URL into a Blob that keeps the media type from the URL
 * header, so a PNG data URL becomes a Blob of type "image/png". Throws a
 * readable Error when the input is not a decodable data URL.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const { type, bytes } = decodeDataUrl(dataUrl);
  return new Blob([bytes], { type });
}

/**
 * Converts a data URL into raw bytes. The zip writer wants Uint8Arrays for
 * its entries, so a multi page export decodes each page with this before
 * bundling them. Throws a readable Error when the input cannot be decoded.
 */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  return decodeDataUrl(dataUrl).bytes;
}

/**
 * Saves a Blob to the user's disk under the given filename. It creates an
 * object URL, clicks a hidden anchor pointing at it, and revokes the URL a
 * moment later so the browser can free the memory. Browser only. Throws a
 * readable Error when there is no document to attach the anchor to.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("Downloads only work in a browser window.");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/**
 * Saves a data URL to disk under the given filename. It goes through a Blob
 * rather than putting the data URL straight on an anchor, because very long
 * data URLs on an href fail silently in some browsers. Browser only.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  downloadBlob(dataUrlToBlob(dataUrl), filename);
}

/**
 * Makes a project name safe to use as a filename. It drops characters that
 * are illegal on Windows, macOS or Linux, turns runs of whitespace into a
 * single dash, trims dots and dashes off the ends, and cuts the result to 80
 * characters. When nothing usable is left it returns the fallback, which
 * defaults to "untitled". The caller adds the extension afterwards.
 */
export function safeFilename(name: string, fallback: string = DEFAULT_FILENAME): string {
  const cleaned = name
    .replace(/[\s-]+/g, "-")
    .replace(ILLEGAL_FILENAME_CHARS, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  // Cut by code points rather than UTF-16 units, so an emoji sitting on the
  // boundary is dropped whole instead of leaving half a surrogate pair behind.
  const cut = Array.from(cleaned)
    .slice(0, MAX_FILENAME_LENGTH)
    .join("")
    .replace(/[-.]+$/g, "");

  if (cut.length > 0) return cut;
  return fallback.trim().length > 0 ? fallback.trim() : DEFAULT_FILENAME;
}
