"use client";
import { linePoints, pointsToSvgPath, polygonPoints } from "@/data/shapes";
import type { CanvasElement, ShapeKind } from "@/model/types";

interface ShapePreviewProps {
  kind: ShapeKind;
  fill: string;
  stroke: string;
  size?: number;
}

/** Small SVG drawing of a shape, used in the shapes panel and the selection preview. */
export function ShapePreview({ kind, fill, stroke, size = 48 }: ShapePreviewProps) {
  const pad = 4;
  const box = size - pad * 2;
  const paint = { fill: fill === "transparent" ? "none" : fill, stroke: stroke === "transparent" ? "none" : stroke, strokeWidth: 2 };
  const lineColor = stroke === "transparent" ? fill : stroke;

  const inner = (() => {
    switch (kind) {
      case "rectangle":
        return <rect x={0} y={0} width={box} height={box} rx={2} {...paint} />;
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

/** Preview box at the top of the selection panel. */
export function ElementPreview({ element }: ElementPreviewProps) {
  const flip = `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`;
  return (
    <div className="element-preview">
      {element.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={element.src} alt="" style={{ transform: flip }} />
      ) : null}
      {element.type === "shape" ? (
        <div style={{ transform: flip }}>
          <ShapePreview kind={element.shape} fill={element.fill} stroke={element.stroke} size={72} />
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
