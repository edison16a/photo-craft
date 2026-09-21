/**
 * Core data model for Photo Craft.
 *
 * A Project has a fixed pixel size and one or more Pages. Each Page holds an
 * ordered list of Elements (later entries draw on top of earlier ones).
 * Everything in here is plain JSON so it can be stored in IndexedDB and
 * copied freely.
 */

/** Position and size of an element before rotation, in page pixels. */
export interface ElementBase {
  id: string;
  /** Left edge of the unrotated box. */
  x: number;
  /** Top edge of the unrotated box. */
  y: number;
  width: number;
  height: number;
  /** Rotation in degrees, clockwise, around the box centre. */
  rotation: number;
  /** 0 to 1. */
  opacity: number;
  /** Locked elements can be selected but not moved, resized or rotated. */
  locked: boolean;
  flipX: boolean;
  flipY: boolean;
}

export type TextAlign = "left" | "center" | "right";

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  underline: boolean;
  fill: string;
  align: TextAlign;
  /** Multiplier of the font size, for example 1.2. */
  lineHeight: number;
  letterSpacing: number;
}

export type ShapeKind =
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "star"
  | "line"
  | "arrow";

export interface ShapeElement extends ElementBase {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Only used by rectangles. */
  cornerRadius: number;
}

export interface ImageElement extends ElementBase {
  type: "image";
  /** Always a data URL so exports never hit cross origin limits. */
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export type CanvasElement = TextElement | ShapeElement | ImageElement;
export type ElementType = CanvasElement["type"];

export interface Page {
  id: string;
  name: string;
  /** CSS colour. Use "transparent" for no fill. */
  background: string;
  elements: CanvasElement[];
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  pages: Page[];
  /** Milliseconds since epoch. */
  createdAt: number;
  updatedAt: number;
}

/** Lightweight listing entry shown on the home screen. */
export interface ProjectSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  pageCount: number;
  updatedAt: number;
  /** Small PNG data URL of the first page, if one was generated. */
  thumbnail?: string;
}

/** Axis aligned rectangle in page pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}
