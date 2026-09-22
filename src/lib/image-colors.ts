/**
 * Picks out the handful of colours that stand out in a picture.
 *
 * The colour picker shows them in a "Project colours" section so a user
 * can match text and shapes to the photos already on the page. The image
 * is drawn small, every pixel is dropped into a coarse RGB bucket, and the
 * fullest buckets win as long as they look different from each other.
 */
import { getCachedImage } from "./image-cache";

/** Longest side the image is drawn at before sampling. Small keeps it fast. */
export const SAMPLE_SIZE = 48;

/** How many colours quantizeColors hands back unless told otherwise. */
export const MAX_IMAGE_COLORS = 6;

/** A colour and how many sampled pixels landed on it. */
export interface ColorCount {
  hex: string;
  count: number;
}

/** Pixels with alpha under this are treated as see through and skipped. */
const MIN_ALPHA = 128;

/** A bucket holding a smaller share of the counted pixels than this is noise. */
const MIN_SHARE = 0.005;

/** Default RGB distance two chosen colours must keep between them. */
const DEFAULT_MIN_DISTANCE = 48;

/** Running totals for one bucket of similar colours. */
interface Bucket {
  count: number;
  red: number;
  green: number;
  blue: number;
}

/** One colour as three 0 to 255 channels. */
interface Rgb {
  red: number;
  green: number;
  blue: number;
}

/** Turns a 0 to 255 channel value into two lowercase hex digits. */
function channelToHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

/** The average colour of everything that landed in a bucket, rounded. */
function averageOf(bucket: Bucket): Rgb {
  return {
    red: Math.round(bucket.red / bucket.count),
    green: Math.round(bucket.green / bucket.count),
    blue: Math.round(bucket.blue / bucket.count),
  };
}

/** Squared Euclidean distance in RGB space. Squared to avoid a square root per pair. */
function distanceSquared(a: Rgb, b: Rgb): number {
  const red = a.red - b.red;
  const green = a.green - b.green;
  const blue = a.blue - b.blue;
  return red * red + green * green + blue * blue;
}

/**
 * Pure. pixels is RGBA data (like ImageData.data). Pixels with alpha below
 * 128 are skipped. Each channel is quantised to 16 levels (value >> 4) to
 * bucket similar colours; the bucket's representative colour is the average
 * of the pixels that landed in it (rounded, as lowercase #rrggbb). Buckets
 * are sorted by count, and a bucket is dropped when it is too close to an
 * already chosen colour (Euclidean RGB distance below minDistance, default
 * 48) so the result is varied. Buckets holding fewer than 0.5 percent of
 * the counted pixels are ignored. Returns at most maxColors entries.
 */
export function quantizeColors(
  pixels: Uint8ClampedArray,
  maxColors: number = MAX_IMAGE_COLORS,
  minDistance: number = DEFAULT_MIN_DISTANCE,
): ColorCount[] {
  const buckets = new Map<number, Bucket>();
  let counted = 0;
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    if (pixels[offset + 3] < MIN_ALPHA) continue;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const key = ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
    } else {
      buckets.set(key, { count: 1, red, green, blue });
    }
    counted += 1;
  }
  if (counted === 0 || maxColors <= 0) return [];
  const floor = counted * MIN_SHARE;
  const ranked = [...buckets.values()]
    .filter((bucket) => bucket.count >= floor)
    .sort((a, b) => b.count - a.count);
  const limit = minDistance * minDistance;
  const chosen: { rgb: Rgb; count: number }[] = [];
  for (const bucket of ranked) {
    if (chosen.length >= maxColors) break;
    const rgb = averageOf(bucket);
    const tooClose = chosen.some((entry) => distanceSquared(entry.rgb, rgb) < limit);
    if (!tooClose) chosen.push({ rgb, count: bucket.count });
  }
  return chosen.map(({ rgb, count }) => ({
    hex: `#${channelToHex(rgb.red)}${channelToHex(rgb.green)}${channelToHex(rgb.blue)}`,
    count,
  }));
}

/**
 * Browser only. Draws the image onto a canvas no bigger than SAMPLE_SIZE on
 * its longest side (keeping the ratio, at least 1 by 1), reads the pixels
 * and returns quantizeColors(...).map(c => c.hex). Returns [] when a canvas
 * context is unavailable or the image has no size. Never throws.
 */
export function extractImageColors(
  image: HTMLImageElement | HTMLCanvasElement,
  maxColors: number = MAX_IMAGE_COLORS,
): string[] {
  try {
    const sourceWidth = "naturalWidth" in image ? image.naturalWidth || image.width : image.width;
    const sourceHeight = "naturalHeight" in image ? image.naturalHeight || image.height : image.height;
    if (!(sourceWidth > 0) || !(sourceHeight > 0)) return [];
    const scale = Math.min(1, SAMPLE_SIZE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    return quantizeColors(data, maxColors).map((color) => color.hex);
  } catch {
    // A tainted canvas or a browser without canvas support ends up here.
    // No colours is a fine answer for a picker section.
    return [];
  }
}

/** Colours already worked out, or still being worked out, keyed by image src. */
const colorCache = new Map<string, Promise<string[]>>();

/**
 * Cached, browser only. Loads the image through getCachedImage from
 * src/lib/image-cache.ts (it resolves data URLs to HTMLImageElement) and
 * extracts once per src. Failures cache an empty list so a broken image is
 * not retried on every render.
 */
export function getImageColors(src: string): Promise<string[]> {
  const hit = colorCache.get(src);
  if (hit) return hit;
  const promise = Promise.resolve()
    .then(() => getCachedImage(src))
    .then((image) => extractImageColors(image))
    .catch(() => []);
  colorCache.set(src, promise);
  return promise;
}
