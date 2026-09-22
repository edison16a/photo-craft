"use client";
import { Circle, Line } from "react-konva";
import { CURVE_TENSION, type DrawOptions } from "@/lib/drawing";
import type { Point } from "@/model/types";

const ACCENT = "#2b8cff";

interface DrawPreviewProps {
  points: number[];
  stroke: number[];
  hover: Point | null;
  options: DrawOptions;
  zoom: number;
}

/**
 * What the draw tool shows while a shape is being made: the corners so
 * far joined the way the finished shape will be, a dashed line from the
 * last corner to the pointer, the freehand stroke in progress, and a dot
 * on every corner. The first dot grows once the shape can be closed.
 */
export function DrawPreview({ points, stroke, hover, options, zoom }: DrawPreviewProps) {
  const count = points.length / 2;
  if (count === 0 && stroke.length === 0) return null;
  const tension = options.curved ? CURVE_TENSION : 0;
  const last = count > 0 ? { x: points[points.length - 2], y: points[points.length - 1] } : null;
  const canClose = options.closed && count >= 3;
  const dots: Point[] = [];
  for (let index = 0; index < points.length; index += 2) dots.push({ x: points[index], y: points[index + 1] });

  return (
    <>
      {count >= 2 ? (
        <Line points={points} tension={tension} stroke={ACCENT} strokeWidth={2 / zoom} lineJoin="round" lineCap="round" listening={false} />
      ) : null}
      {stroke.length >= 4 ? <Line points={stroke} stroke={ACCENT} strokeWidth={2 / zoom} lineJoin="round" lineCap="round" listening={false} /> : null}
      {last && hover && stroke.length === 0 ? (
        <Line
          points={canClose ? [last.x, last.y, hover.x, hover.y, points[0], points[1]] : [last.x, last.y, hover.x, hover.y]}
          stroke={ACCENT}
          strokeWidth={1 / zoom}
          dash={[6 / zoom, 4 / zoom]}
          listening={false}
        />
      ) : null}
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
