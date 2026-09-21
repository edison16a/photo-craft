/**
 * Image search through the Google Custom Search JSON API.
 *
 * The user brings their own API key and Programmable Search Engine id (see
 * settings.ts). This module only builds URLs, calls the API and turns the
 * response into a small result shape the UI can render. It has no React or
 * store dependencies so it is easy to test with a fake fetch.
 */

/** One image hit, trimmed down to what the picker needs. */
export interface ImageSearchResult {
  /** Stable within a page of results. Usually the full size image URL. */
  id: string;
  title: string;
  /** Full size image. */
  imageUrl: string;
  /** Small preview served by Google, safe to show in a grid. */
  thumbnailUrl: string;
  width: number;
  height: number;
  /** The web page the image was found on. */
  sourceUrl: string;
}

/** What to search for. Start is the 1 based index of the first result wanted. */
export interface ImageSearchQuery {
  query: string;
  start?: number;
  /** Ask Google for images with a transparent background only. */
  transparentOnly?: boolean;
}

/** The two values Google needs before it will answer. */
export interface GoogleSearchCredentials {
  apiKey: string;
  searchEngineId: string;
}

/** A page of results plus where the next page starts, if there is one. */
export interface ImageSearchPage {
  results: ImageSearchResult[];
  nextStart?: number;
}

const API_ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const POPUP_ENDPOINT = "https://www.google.com/search";
const RESULTS_PER_PAGE = 10;

/**
 * Builds the JSON API request URL. Always asks for images, ten per page,
 * with safe search on. Adds imgColorType=trans when only transparent images
 * are wanted. Everything is URL encoded so odd queries are fine.
 */
export function buildGoogleSearchApiUrl(
  credentials: GoogleSearchCredentials,
  query: ImageSearchQuery,
): string {
  const params = new URLSearchParams();
  params.set("key", credentials.apiKey);
  params.set("cx", credentials.searchEngineId);
  params.set("q", query.query);
  params.set("searchType", "image");
  params.set("num", String(RESULTS_PER_PAGE));
  params.set("start", String(query.start ?? 1));
  params.set("safe", "active");
  if (query.transparentOnly) params.set("imgColorType", "trans");
  return `${API_ENDPOINT}?${params.toString()}`;
}

/**
 * Builds a normal Google Images URL for opening in a popup window, for people
 * who have no API key. The user can then drag images from that window onto
 * the canvas. Adds the transparent filter when asked.
 */
export function buildGoogleImagesPopupUrl(query: string, transparentOnly: boolean): string {
  const base = `${POPUP_ENDPOINT}?tbm=isch&q=${encodeURIComponent(query)}`;
  return transparentOnly ? `${base}&tbs=ic:trans` : base;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function readNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseItem(item: unknown, index: number, seen: Set<string>): ImageSearchResult | null {
  if (!isRecord(item)) return null;
  const imageUrl = readString(item, "link");
  if (!imageUrl) return null;
  const image = isRecord(item.image) ? item.image : {};
  const id = seen.has(imageUrl) ? `${imageUrl}#${index}` : imageUrl;
  seen.add(imageUrl);
  return {
    id,
    title: readString(item, "title"),
    imageUrl,
    thumbnailUrl: readString(image, "thumbnailLink") || imageUrl,
    width: readNumber(image, "width") ?? 0,
    height: readNumber(image, "height") ?? 0,
    sourceUrl: readString(image, "contextLink"),
  };
}

/**
 * Turns a raw API response body into an ImageSearchPage. Items without a
 * link are dropped. Missing fields become empty strings or zero rather than
 * throwing, because Google does leave fields out now and then. The next page
 * start index comes from queries.nextPage[0].startIndex when present.
 */
export function parseGoogleSearchResponse(json: unknown): ImageSearchPage {
  const page: ImageSearchPage = { results: [] };
  if (!isRecord(json)) return page;

  const seen = new Set<string>();
  const items: unknown[] = Array.isArray(json.items) ? json.items : [];
  items.forEach((item, index) => {
    const result = parseItem(item, index, seen);
    if (result) page.results.push(result);
  });

  const queries = isRecord(json.queries) ? json.queries : {};
  const nextPage: unknown = Array.isArray(queries.nextPage) ? queries.nextPage[0] : undefined;
  if (isRecord(nextPage)) {
    const startIndex = readNumber(nextPage, "startIndex");
    if (startIndex !== undefined) page.nextStart = startIndex;
  }
  return page;
}

/** Digs the human readable message out of a Google error body, if there is one. */
function readErrorMessage(body: unknown): string | undefined {
  if (!isRecord(body) || !isRecord(body.error)) return undefined;
  const message = readString(body.error, "message");
  return message || undefined;
}

/**
 * Runs an image search and returns one page of results. Pass your own fetch
 * in tests. When Google answers with an error status this throws an Error
 * carrying the API's own message (for example a bad key or quota exceeded),
 * or a generic status message when the body has no message.
 */
export async function searchGoogleImages(
  credentials: GoogleSearchCredentials,
  query: ImageSearchQuery,
  fetchImpl?: typeof fetch,
): Promise<ImageSearchPage> {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const response = await doFetch(buildGoogleSearchApiUrl(credentials, query));
  let body: unknown = undefined;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    const message = readErrorMessage(body) ?? `Google image search failed with status ${response.status}.`;
    throw new Error(message);
  }
  return parseGoogleSearchResponse(body);
}

/** True when both credential fields have something in them after trimming. */
export function hasGoogleCredentials(settings: {
  googleApiKey: string;
  googleSearchEngineId: string;
}): boolean {
  return settings.googleApiKey.trim() !== "" && settings.googleSearchEngineId.trim() !== "";
}
