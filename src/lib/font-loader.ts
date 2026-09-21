/**
 * Loads Google fonts into the page so text elements render with the family
 * they asked for. Browser only. System fonts need nothing, so calls for them
 * resolve right away. Each Google family gets one stylesheet link, tagged
 * with a data-font attribute so we never add it twice, and then we ask the
 * FontFaceSet to fetch the four faces the editor uses.
 */
import { findFont, googleFontsCssUrl } from "../data/fonts";

/** Attribute that marks the links this module injects. */
const LINK_ATTRIBUTE = "data-font";

/** Faces we preload: regular, bold, italic and bold italic. */
const FONT_VARIANTS = ["400", "700", "italic 400", "italic 700"];

/** Size used in the font strings passed to document.fonts.load. */
const PROBE_SIZE = "16px";

/** Longest we wait for a stylesheet before giving up on it, in milliseconds. */
const STYLESHEET_TIMEOUT_MS = 10000;

/** In flight or finished load per family, keyed by canonical family name. */
const loadPromises = new Map<string, Promise<void>>();

/** Families whose load attempt has finished, whether or not it succeeded. */
const finishedFamilies = new Set<string>();

/** True when a real DOM is around. Guards against server side calls. */
function hasDocument(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.createElement === "function"
  );
}

/** Finds the link this module (or anyone) already added for a family. */
function findLink(family: string): HTMLLinkElement | null {
  const links = document.querySelectorAll<HTMLLinkElement>(
    `link[${LINK_ATTRIBUTE}]`,
  );
  for (const link of Array.from(links)) {
    if (link.getAttribute(LINK_ATTRIBUTE) === family) {
      return link;
    }
  }
  return null;
}

/** Appends a stylesheet link for one family to the document head. */
function injectLink(family: string): HTMLLinkElement {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = googleFontsCssUrl([family]);
  link.setAttribute(LINK_ATTRIBUTE, family);
  (document.head ?? document.documentElement).appendChild(link);
  return link;
}

/**
 * Resolves once the stylesheet has loaded or failed, or after a timeout so a
 * stuck request can never hang the caller.
 */
function waitForStylesheet(link: HTMLLinkElement): Promise<void> {
  if (link.sheet) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      link.removeEventListener("load", done);
      link.removeEventListener("error", done);
      resolve();
    };
    const timer = setTimeout(done, STYLESHEET_TIMEOUT_MS);
    link.addEventListener("load", done);
    link.addEventListener("error", done);
  });
}

/** Asks the FontFaceSet to fetch the four faces we use. Failures are ignored. */
async function loadVariants(family: string): Promise<void> {
  const fontSet: FontFaceSet | undefined = document.fonts;
  if (!fontSet || typeof fontSet.load !== "function") {
    return;
  }
  const quoted = `"${family.replace(/"/g, "")}"`;
  await Promise.all(
    FONT_VARIANTS.map((variant) =>
      fontSet
        .load(`${variant} ${PROBE_SIZE} ${quoted}`)
        .catch((): FontFace[] => []),
    ),
  );
}

/** Full load for one Google family: stylesheet first, then the faces. */
async function loadGoogleFamily(family: string): Promise<void> {
  const link = findLink(family) ?? injectLink(family);
  await waitForStylesheet(link);
  await loadVariants(family);
}

/**
 * Makes sure a font is ready to draw with. System fonts and names we do not
 * know resolve at once. Google fonts get a stylesheet link (only one per
 * family) and we wait for the regular, bold, italic and bold italic faces at
 * 16px. The promise never rejects: a failed download just resolves, since
 * the browser will draw a fallback font anyway. Results are cached, so
 * calling this many times for the same family costs nothing extra.
 */
export function ensureFontLoaded(family: string): Promise<void> {
  const option = findFont(family);
  if (!option || option.source !== "google" || !hasDocument()) {
    return Promise.resolve();
  }
  const name = option.family;
  const cached = loadPromises.get(name);
  if (cached) {
    return cached;
  }
  const promise = loadGoogleFamily(name)
    .catch(() => undefined)
    .then(() => {
      finishedFamilies.add(name);
    });
  loadPromises.set(name, promise);
  return promise;
}

/**
 * Loads several families at the same time and resolves when all of them
 * have finished. Handy when opening a project that uses many fonts.
 */
export async function ensureFontsLoaded(families: string[]): Promise<void> {
  await Promise.all(families.map((family) => ensureFontLoaded(family)));
}

/**
 * Tells you whether ensureFontLoaded has already finished for a family.
 * System fonts and unknown names count as loaded because there is nothing
 * to fetch for them.
 */
export function isFontLoaded(family: string): boolean {
  const option = findFont(family);
  if (!option || option.source !== "google") {
    return true;
  }
  return finishedFamilies.has(option.family);
}
