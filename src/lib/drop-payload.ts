/**
 * Reading images out of a drag and drop or paste event.
 *
 * The browser hands us a DataTransfer with a bag of typed entries and it is
 * not obvious where the picture lives. A file dropped from the desktop shows
 * up in `files`. An image dragged out of another tab, say a Google Images
 * result in a second window, arrives as text: Chrome writes the image src
 * into text/uri-list and a tiny html fragment with an img tag into text/html,
 * and that src is very often a data URL rather than a web address. A link
 * pasted from the clipboard is just text/plain.
 *
 * This module checks every one of those places in a fixed order and hands
 * back one list of files and one list of urls, so the editor only has to
 * know about two things. Everything here is synchronous. The only DOM
 * dependency is DOMParser, used to read the html fragment safely.
 */

/**
 * What we found in the event. `urls` can hold data URLs as well as http(s)
 * addresses, so run them through the image loader rather than fetch directly.
 */
export interface DropPayload {
  files: File[];
  urls: string[];
}

const URI_LIST_TYPE = "text/uri-list";
const HTML_TYPE = "text/html";
const PLAIN_TYPE = "text/plain";

/**
 * Schemes a web page can never load an image from. Linux file managers put a
 * file: url into text/uri-list right next to the File itself, so without this
 * list we would report the same picture twice and fail on the second copy.
 */
const UNUSABLE_SCHEMES = ["file:", "javascript:", "about:"];

/**
 * Pulls every image we can find out of a DataTransfer from a drop or paste.
 *
 * Files are the ones with an image/* type, in the order the browser gave
 * them. Urls come from text/uri-list first (comment lines starting with #
 * are skipped), then the src of every img tag in text/html, then text/plain
 * when the whole text is a single image url or data url. Duplicates are
 * dropped and the first occurrence keeps its place.
 *
 * Passing null gives an empty payload, so `event.dataTransfer` and
 * `event.clipboardData` can be passed straight in without a null check.
 */
export function extractDropPayload(dataTransfer: DataTransfer | null): DropPayload {
  if (!dataTransfer) return { files: [], urls: [] };

  const plain = readData(dataTransfer, PLAIN_TYPE).trim();
  const candidates = [
    ...parseUriList(readData(dataTransfer, URI_LIST_TYPE)),
    ...extractImageSourcesFromHtml(readData(dataTransfer, HTML_TYPE)),
    ...(looksLikeImageUrl(plain) ? [plain] : []),
  ];

  return {
    files: imageFiles(dataTransfer),
    urls: Array.from(new Set(candidates.filter(isUsableUrl))),
  };
}

/**
 * Returns the src attribute of every img tag in an html string, in document
 * order. Uses DOMParser so nothing in the fragment can run or load. The src
 * is returned exactly as written, so a relative path stays relative and a
 * data URL comes back whole. Images without a src are skipped. Returns an
 * empty list when there is no DOM to parse with.
 */
export function extractImageSourcesFromHtml(html: string): string[] {
  if (!html.trim() || typeof DOMParser === "undefined") return [];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const sources: string[] = [];
  doc.querySelectorAll("img").forEach((img) => {
    const src = (img.getAttribute("src") ?? "").trim();
    if (src) sources.push(src);
  });
  return sources;
}

/**
 * True when a piece of text is a single data:image/ URL or an http(s) URL.
 * Surrounding whitespace is fine, whitespace in the middle is not, so a
 * pasted sentence that happens to contain a link does not count. Other
 * schemes like ftp: or blob: are rejected because the image loader cannot
 * do anything with them.
 */
export function looksLikeImageUrl(text: string): boolean {
  const value = text.trim();
  if (!value || /\s/.test(value)) return false;
  if (value.toLowerCase().startsWith("data:image/")) return true;

  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** Reads one entry from the transfer. Some browsers throw for unknown types. */
function readData(dataTransfer: DataTransfer, type: string): string {
  try {
    return dataTransfer.getData(type) ?? "";
  } catch {
    return "";
  }
}

/** Keeps the image/* entries of the file list. Tolerates a missing list. */
function imageFiles(dataTransfer: DataTransfer): File[] {
  const list: ArrayLike<File> | null | undefined = dataTransfer.files;
  if (!list) return [];
  return Array.from(list).filter((file) =>
    (file.type ?? "").toLowerCase().startsWith("image/"),
  );
}

/**
 * Splits a text/uri-list body into urls. The format is one url per line,
 * lines may end in CRLF, and lines starting with # are comments.
 */
function parseUriList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/** False for the handful of schemes listed in UNUSABLE_SCHEMES. */
function isUsableUrl(value: string): boolean {
  const lower = value.toLowerCase();
  return !UNUSABLE_SCHEMES.some((scheme) => lower.startsWith(scheme));
}
