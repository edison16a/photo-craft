/**
 * The maths between an image and the cutout model, with no DOM in sight:
 * pixels in, a float tensor out, and the model's answer back into an
 * alpha channel. The canvas work that feeds and consumes these lives in
 * the worker, so this file can be unit tested on its own.
 */

/** Input square of the small model, and the default for the helpers here. */
export const MODEL_INPUT_SIZE = 320;

/** ImageNet channel means the models were trained with, as RGB fractions. */
const MEAN: readonly number[] = [0.485, 0.456, 0.406];
/** ImageNet channel deviations, matching MEAN. */
const STD: readonly number[] = [0.229, 0.224, 0.225];

/**
 * Turns RGBA pixels of a size by size square into the model's input:
 * planar RGB, each channel offset by mean and divided by std. Values are
 * scaled by the brightest channel value in the picture rather than a
 * fixed 255, the same as the reference implementation, so a dim picture
 * is stretched before it is judged.
 */
export function pixelsToTensor(pixels: Uint8ClampedArray, size: number = MODEL_INPUT_SIZE, mean: readonly number[] = MEAN, std: readonly number[] = STD): Float32Array {
  const area = size * size;
  if (pixels.length !== area * 4) throw new Error(`Expected ${area * 4} bytes of RGBA, got ${pixels.length}.`);
  let brightest = 1;
  for (let i = 0; i < pixels.length; i += 4) {
    const channelMax = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (channelMax > brightest) brightest = channelMax;
  }
  const tensor = new Float32Array(3 * area);
  for (let pixel = 0, byte = 0; pixel < area; pixel += 1, byte += 4) {
    tensor[pixel] = (pixels[byte] / brightest - mean[0]) / std[0];
    tensor[area + pixel] = (pixels[byte + 1] / brightest - mean[1]) / std[1];
    tensor[2 * area + pixel] = (pixels[byte + 2] / brightest - mean[2]) / std[2];
  }
  return tensor;
}

/**
 * Turns the model's first output plane into 0 to 255 alpha values. The
 * raw output is stretched so its lowest value becomes fully transparent
 * and its highest fully opaque, which is how the reference implementation
 * reads it. A flat output (all the same value) becomes fully opaque, so a
 * confused model leaves the picture alone rather than deleting it.
 */
export function outputToAlpha(output: ArrayLike<number>, size: number = MODEL_INPUT_SIZE): Uint8ClampedArray<ArrayBuffer> {
  const area = size * size;
  if (output.length < area) throw new Error(`Expected at least ${area} output values, got ${output.length}.`);
  let lowest = Number.POSITIVE_INFINITY;
  let highest = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < area; i += 1) {
    const value = output[i];
    if (value < lowest) lowest = value;
    if (value > highest) highest = value;
  }
  const alpha = new Uint8ClampedArray(area);
  const range = highest - lowest;
  if (!(range > 0) || !Number.isFinite(range)) {
    alpha.fill(255);
    return alpha;
  }
  for (let i = 0; i < area; i += 1) {
    alpha[i] = Math.round(((output[i] - lowest) / range) * 255);
  }
  return alpha;
}

/**
 * Writes an alpha plane into the alpha channel of RGBA pixels, in place.
 * The plane must have one value per pixel. Existing transparency is kept
 * by taking the smaller of the two, so a PNG that was already partly see
 * through does not get its holes filled back in.
 */
export function applyAlpha(pixels: Uint8ClampedArray, alpha: Uint8ClampedArray): void {
  if (pixels.length !== alpha.length * 4) throw new Error(`Alpha plane of ${alpha.length} does not match ${pixels.length / 4} pixels.`);
  for (let pixel = 0, byte = 3; pixel < alpha.length; pixel += 1, byte += 4) {
    if (alpha[pixel] < pixels[byte]) pixels[byte] = alpha[pixel];
  }
}

/**
 * Expands an alpha plane into RGBA pixels (grey with full opacity), so a
 * canvas can resize it with proper filtering before it is applied to the
 * picture at full size.
 */
export function alphaToGreyPixels(alpha: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(alpha.length * 4);
  for (let pixel = 0, byte = 0; pixel < alpha.length; pixel += 1, byte += 4) {
    pixels[byte] = alpha[pixel];
    pixels[byte + 1] = alpha[pixel];
    pixels[byte + 2] = alpha[pixel];
    pixels[byte + 3] = 255;
  }
  return pixels;
}

/**
 * Reads a resized grey mask back out of RGBA pixels, taking the red
 * channel as the alpha value. The inverse of alphaToGreyPixels after a
 * canvas has scaled it.
 */
export function greyPixelsToAlpha(pixels: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer> {
  const alpha = new Uint8ClampedArray(pixels.length / 4);
  for (let pixel = 0, byte = 0; pixel < alpha.length; pixel += 1, byte += 4) {
    alpha[pixel] = pixels[byte];
  }
  return alpha;
}
