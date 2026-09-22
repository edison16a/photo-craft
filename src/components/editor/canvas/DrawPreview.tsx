"use client";
import { Circle, Line, Shape } from "react-konva";
import type { DrawOptions } from "@/lib/drawing";
import type { Point } from "@/model/types";

const ACCENT = "#2b8cff";

interface DrawGridProps {
  pageWidth: number;
  pageHeight: number;
  grid: number;
  zoom: number;
}

/** Dots on every grid crossing of the page, drawn in one go so a fine grid stays cheap. */
export function DrawGrid({ pageWidth, pageHeight, grid, zoom }: DrawGridProps) {
  if (!(grid > 0)) return null;
  const dot = 1.5 / zoom;
  return (
    <Shape
      listening={false}
      sceneFunc={(context, shape) => {
        context.beginPath();
        for (let x = 0; x <= pageWidth; x += grid) {
          for (let y = 0; y <= pageHeight; y += grid) context.rect(x - dot / 2, y - dot / 2, dot, dot);
        }
        context.fillStrokeShape(shape);
      }}
      fill="rgba(43, 140, 255, 0.45)"
    />
  );
}

interface DrawPreviewProps {
  points: number[];
  hover: Point | null;
  options: DrawOptions;
  zoom: number;
}

/**
 * What the draw tool shows while a shape is being made: the corners so
 * far joined by straight sides, a dashed line from the last corner to the
 * grid crossing under the pointer, a ring on that crossing, and a dot on
 * every corner. The first dot grows once the shape can be closed.
 */
export function DrawPreview({ points, hover, options, zoom }: DrawPreviewProps) {
  const count = points.length / 2;
  const last = count > 0 ? { x: points[points.length - 2], y: points[points.length - 1] } : null;
  const canClose = options.closed && count >= 3;
  const dots: Point[] = [];
  for (let index = 0; index < points.length; index += 2) dots.push({ x: points[index], y: points[index + 1] });

  return (
    <>
      {count >= 2 ? <Line points={points} stroke={ACCENT} strokeWidth={2 / zoom} lineJoin="round" lineCap="round" listening={false} /> : null}
      {last && hover ? (
        <Line
          points={canClose ? [last.x, last.y, hover.x, hover.y, points[0], points[1]] : [last.x, last.y, hover.x, hover.y]}
          stroke={ACCENT}
          strokeWidth={1 / zoom}
          dash={[6 / zoom, 4 / zoom]}
          listening={false}
        />
      ) : null}
      {hover ? <Circle x={hover.x} y={hover.y} radius={5 / zoom} stroke={ACCENT} strokeWidth={1.5 / zoom} listening={false} /> : null}
      {dots.map((dot, index) => (
        <Circle
          key={index}
          x={dot.x}
          y={dot.y}
          radius={(index === 0 && canClose ? 6 : 4) / zoom}
          fill="#ffffff"
          stroke={ACCENT}
          strokeWidth={1.5 / zoom}
          listening={false}
        />
      ))}
    </>
  );
}
