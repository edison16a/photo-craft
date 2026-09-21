import { createId } from "./ids";
import type {
  CanvasElement,
  ElementBase,
  ImageElement,
  ShapeElement,
  ShapeKind,
  TextElement,
} from "./types";

/** Default font used by new text elements. Always available offline. */
export const DEFAULT_FONT_FAMILY = "Arial";

function baseElement(partial: Partial<ElementBase> = {}): ElementBase {
  return {
    id: createId("el"),
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
    locked: false,
    flipX: false,
    flipY: false,
    ...partial,
  };
}

/** Creates a text element with sensible defaults for a headline. */
export function createTextElement(
  partial: Partial<Omit<TextElement, "type">> = {},
): TextElement {
  return {
    ...baseElement({ width: 360, height: 60 }),
    type: "text",
    text: "Add your text",
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: 40,
    fontWeight: "normal",
    fontStyle: "normal",
    underline: false,
    fill: "#111214",
    align: "left",
    lineHeight: 1.2,
    letterSpacing: 0,
    ...partial,
  };
}

/** Creates a filled shape. Lines and arrows get a stroke instead of a fill. */
export function createShapeElement(
  shape: ShapeKind,
  partial: Partial<Omit<ShapeElement, "type" | "shape">> = {},
): ShapeElement {
  const isStrokeOnly = shape === "line" || shape === "arrow";
  return {
    ...baseElement(isStrokeOnly ? { width: 300, height: 40 } : {}),
    type: "shape",
    shape,
    fill: isStrokeOnly ? "transparent" : "#4da3ff",
    stroke: isStrokeOnly ? "#111214" : "transparent",
    strokeWidth: isStrokeOnly ? 6 : 0,
    cornerRadius: 0,
    ...partial,
  };
}

/** Creates an image element sized to the image's natural dimensions. */
export function createImageElement(
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  partial: Partial<Omit<ImageElement, "type" | "src">> = {},
): ImageElement {
  return {
    ...baseElement({ width: naturalWidth, height: naturalHeight }),
    type: "image",
    src,
    naturalWidth,
    naturalHeight,
    ...partial,
  };
}

/** Deep copies an element and gives the copy a fresh ID. */
export function cloneElement(element: CanvasElement, offset = 0): CanvasElement {
  return {
    ...structuredClone(element),
    id: createId("el"),
    x: element.x + offset,
    y: element.y + offset,
  };
}
