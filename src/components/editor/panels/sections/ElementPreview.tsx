"use client";
import { isDefaultAdjust, type ImageAdjust } from "@/lib/image-adjust";
import { customPoints, linePoints, PATH_BOX, pointsToSvgPath, polygonPoints, shapeGeometry, shapePathData } from "@/data/shapes";
import { roundedPolygonPath } from "@/lib/rounded-path";
import type { CanvasElement, ShapeElement, ShapeKind } from "@/model/types";

interface ShapePreviewProps {
  kind: ShapeKind;
  fill: string;
  stroke: string;
  size?: number;
  /** The element itself, needed to draw a custom shape's own corners and any rounding. */
  element?: Pick<ShapeElement, "points" | "closed" | "cornerRadius" | "width" | "height">;
}

/** Small SVG drawing of a shape, used in the shapes panel and the selection preview. */
export function ShapePreview({ kind, fill, stroke, size = 48, element }: ShapePreviewProps) {
  const pad = 4;
  const box = size - pad * 2;
  const paint = { fill: fill === "transparent" ? "none" : fill, stroke: stroke === "transparent" ? "none" : stroke, strokeWidth: 2 };
  const lineColor = stroke === "transparent" ? fill : stroke;
  const geometry = shapeGeometry(kind);

  const inner = (() => {
    if (geometry === "path") {
      return <path d={shapePathData(kind) ?? ""} transform={`scale(${box / PATH_BOX})`} vectorEffect="non-scaling-stroke" {...paint} />;
    }
    // Rounding is in page pixels, so it shrinks with the drawing.
    const previewRadius = element ? (element.cornerRadius * box) / Math.max(1, element.width, element.height) : 0;
    if (geometry === "custom") {
      const closed = element?.closed ?? true;
      const d = roundedPolygonPath(customPoints(element ?? {}, box, box), previewRadius, closed);
      return <path d={d} {...paint} fill={closed ? paint.fill : "none"} stroke={closed ? paint.stroke : lineColor} strokeLinejoin="round" strokeLinecap="round" />;
    }
    if (geometry === "polygon" && previewRadius > 0) {
      return <path d={roundedPolygonPath(polygonPoints(kind, box, box) ?? [], previewRadius, true)} {...paint} strokeLinejoin="round" />;
    }
    switch (kind) {
      case "rectangle":
        return <rect x={0} y={0} width={box} height={box} rx={Math.max(2, previewRadius)} {...paint} />;
      case "ellipse":
        return <ellipse cx={box / 2} cy={box / 2} rx={box / 2} ry={box / 2} {...paint} />;
      case "line":
        return <polyline points={linePoints(box, box).join(" ")} stroke={lineColor} strokeWidth={4} strokeLinecap="round" fill="none" />;
      case "arrow": {
        const [x1, y1, x2, y2] = linePoints(box, box);
        return (
          <g stroke={lineColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <line x1={x1} y1={y1} x2={x2 - 6} y2={y2} />
            <polyline points={`${x2 - 10},${y2 - 8} ${x2},${y2} ${x2 - 10},${y2 + 8}`} />
          </g>
        );
      }
      default:
        return <path d={pointsToSvgPath(polygonPoints(kind, box, box) ?? [])} {...paint} />;
    }
  })();

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <g transform={`translate(${pad} ${pad})`}>{inner}</g>
    </svg>
  );
}

interface ElementPreviewProps {
  element: CanvasElement;
}

/** The browser's own filters, close enough to the canvas maths for a thumbnail. */
function previewFilter(adjust: ImageAdjust | undefined): string | undefined {
  if (!adjust || isDefaultAdjust(adjust)) return undefined;
  return `hue-rotate(${adjust.hue}deg) saturate(${adjust.saturation}%) brightness(${1 + adjust.brightness / 100}) contrast(${1 + adjust.contrast / 100})`;
}

/** Preview box at the top of the selection panel. */
export function ElementPreview({ element }: ElementPreviewProps) {
  const flip = `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`;
  return (
    <div className="element-preview">
      {element.type === "image" && element.tint ? (
        <div className="element-preview__tint" style={{ transform: flip, backgroundColor: element.tint, maskImage: `url(${element.src})`, WebkitMaskImage: `url(${element.src})` }} />
      ) : null}
      {element.type === "image" && !element.tint ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={element.src} alt="" style={{ transform: flip, filter: previewFilter(element.adjust) }} />
      ) : null}
      {element.type === "shape" ? (
        <div style={{ transform: flip }}>
          <ShapePreview kind={element.shape} fill={element.fill} stroke={element.stroke} size={72} element={element} />
        </div>
      ) : null}
      {element.type === "text" ? (
        <span
          className="element-preview__text"
          style={{
            fontFamily: `"${element.fontFamily}", Arial, sans-serif`,
            fontWeight: element.fontWeight,
            fontStyle: element.fontStyle,
            textDecoration: element.underline ? "underline" : "none",
            color: element.fill,
          }}
        >
          {element.text.length > 40 ? `${element.text.slice(0, 40)}...` : element.text}
        </span>
      ) : null}
    </div>
  );
}
