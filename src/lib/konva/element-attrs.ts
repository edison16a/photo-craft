/**
 * Maps model elements to Konva node attributes.
 *
 * Both the live editor (react-konva) and the export renderer (plain Konva
 * on an offscreen stage) use these builders, so what you see on screen is
 * exactly what gets exported.
 */
import type { ImageElement, ShapeElement, TextElement } from "../../model/types";
import { customPoints, linePoints, PATH_BOX, polygonPoints, shapeGeometry, shapePathData } from "../../data/shapes";

/** The fields the outer group needs: the unrotated box plus rotation and opacity. */
export interface GroupSource {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

/**
 * Attributes for the outer group that carries position, rotation and
 * opacity. The group's origin sits at the centre of the unrotated box, so
 * rotation turns the element in place and the model's x and y stay the
 * top left corner of the unrotated box.
 */
export function groupAttrs(element: GroupSource) {
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
    offsetX: element.width / 2,
    offsetY: element.height / 2,
    rotation: element.rotation,
    opacity: element.opacity,
  };
}

/** Converts a group's position (its centre) back to the model's top left corner. */
export function topLeftFromCentre(centre: { x: number; y: number }, width: number, height: number) {
  return { x: centre.x - width / 2, y: centre.y - height / 2 };
}

/**
 * Attributes for the inner group that applies flips. Flipping is done by
 * a negative scale around the element's own centre, so it never affects the
 * transformer on the outer group.
 */
export function flipAttrs(element: { width: number; height: number; flipX: boolean; flipY: boolean }) {
  return {
    x: element.flipX ? element.width : 0,
    y: element.flipY ? element.height : 0,
    scaleX: element.flipX ? -1 : 1,
    scaleY: element.flipY ? -1 : 1,
  };
}

/** Konva.Text attributes. */
export function textAttrs(element: TextElement) {
  const style = [element.fontStyle === "italic" ? "italic" : "", element.fontWeight === "bold" ? "bold" : ""]
    .filter(Boolean)
    .join(" ");
  return {
    text: element.text,
    width: element.width,
    fontFamily: `"${element.fontFamily}", Arial, sans-serif`,
    fontSize: element.fontSize,
    fontStyle: style || "normal",
    textDecoration: element.underline ? "underline" : "",
    fill: element.fill,
    align: element.align,
    lineHeight: element.lineHeight,
    letterSpacing: element.letterSpacing,
    wrap: "word" as const,
  };
}

/** Konva.Image attributes. The image itself is passed separately. */
export function imageAttrs(element: ImageElement) {
  return { width: element.width, height: element.height };
}

/** Fill and stroke shared by every shape node. */
function paintAttrs(element: ShapeElement) {
  return {
    fill: element.fill === "transparent" ? undefined : element.fill,
    stroke: element.stroke === "transparent" || element.strokeWidth <= 0 ? undefined : element.stroke,
    strokeWidth: element.strokeWidth,
  };
}

/** Which Konva node draws a shape, with its attributes. */
export type ShapeNodeSpec =
  | { node: "rect"; attrs: Record<string, unknown> }
  | { node: "ellipse"; attrs: Record<string, unknown> }
  | { node: "line"; attrs: Record<string, unknown> }
  | { node: "arrow"; attrs: Record<string, unknown> }
  | { node: "path"; attrs: Record<string, unknown> };

/**
 * Picks the Konva node type and attributes for a shape. Polygons and stars
 * are closed Konva.Line nodes built from shared point geometry, curved
 * shapes are Konva.Path nodes scaled from their 100 by 100 drawing, and
 * custom shapes are Konva.Line nodes with the tension the draw tool chose.
 */
export function shapeNodeSpec(element: ShapeElement): ShapeNodeSpec {
  const paint = paintAttrs(element);
  const { width, height } = element;
  const geometry = shapeGeometry(element.shape);

  if (geometry === "path") {
    return {
      node: "path",
      attrs: { data: shapePathData(element.shape) ?? "", scaleX: width / PATH_BOX, scaleY: height / PATH_BOX, strokeScaleEnabled: false, ...paint },
    };
  }
  if (geometry === "custom") {
    const closed = element.closed ?? true;
    // An open outline with no stroke would be invisible, so it borrows the fill.
    const stroke = !closed && paint.stroke === undefined ? element.fill : paint.stroke;
    return {
      node: "line",
      attrs: {
        points: customPoints(element, width, height),
        closed,
        tension: element.tension ?? 0,
        lineJoin: "round",
        lineCap: "round",
        ...paint,
        stroke,
        strokeWidth: !closed ? Math.max(1, element.strokeWidth) : element.strokeWidth,
        fill: closed ? paint.fill : undefined,
      },
    };
  }

  switch (element.shape) {
    case "rectangle":
      return {
        node: "rect",
        attrs: { width, height, cornerRadius: element.cornerRadius, ...paint },
      };
    case "ellipse":
      return {
        node: "ellipse",
        attrs: { x: width / 2, y: height / 2, radiusX: width / 2, radiusY: height / 2, ...paint },
      };
    case "line":
      return {
        node: "line",
        attrs: {
          points: linePoints(width, height),
          stroke: element.stroke === "transparent" ? element.fill : element.stroke,
          strokeWidth: Math.max(1, element.strokeWidth),
          lineCap: "round",
        },
      };
    case "arrow":
      return {
        node: "arrow",
        attrs: {
          points: linePoints(width, height),
          stroke: element.stroke === "transparent" ? element.fill : element.stroke,
          fill: element.stroke === "transparent" ? element.fill : element.stroke,
          strokeWidth: Math.max(1, element.strokeWidth),
          pointerLength: Math.max(8, element.strokeWidth * 3),
          pointerWidth: Math.max(8, element.strokeWidth * 3),
          lineCap: "round",
        },
      };
    default:
      return {
        node: "line",
        attrs: { points: polygonPoints(element.shape, width, height) ?? [], closed: true, ...paint },
      };
  }
}
