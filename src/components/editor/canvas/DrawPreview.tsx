"use client";
import { Circle, Line, Path, Shape } from "react-konva";
import { smoothRadius, type DrawOptions } from "@/lib/drawing";
import { roundedPolygonPath } from "@/lib/rounded-path";
import type { Point } from "@/model/types";

const ACCENT = "#2b8cff";
/** A white edge under the blue lines, so they show over a blue fill too. */
const HALO = "rgba(255, 255, 255, 0.9)";

interface DrawGridProps {
  pageWidth: number;
  pageHeight: number;
  grid: number;
  zoom: number;
}

/** Smallest gap between drawn dots in screen pixels. Denser grids show every second, fourth... crossing. */
const MIN_DOT_GAP_PX = 8;

/**
 * Dots on the grid crossings of the page, drawn in one go so a fine grid
 * stays cheap. When the grid is denser than the eye can use at the
 * current zoom, only every second, fourth and so on crossing is shown.
 * Put it on its own layer so pointer moves do not redraw it.
 */
export function DrawGrid({ pageWidth, pageHeight, grid, zoom }: DrawGridProps) {
  if (!(grid > 0)) return null;
  let spacing = grid;
  while (spacing * zoom < MIN_DOT_GAP_PX) spacing *= 2;
  const dot = 3 / zoom;
  return (
    <Shape
      listening={false}
      sceneFunc={(context, shape) => {
        context.beginPath();
        for (let x = 0; x <= pageWidth; x += spacing) {
          for (let y = 0; y <= pageHeight; y += spacing) {
            context.moveTo(x + dot / 2, y);
            context.arc(x, y, dot / 2, 0, Math.PI * 2);
          }
        }
        context.fillStrokeShape(shape);
      }}
      fill="rgba(17, 18, 20, 0.35)"
      stroke="rgba(255, 255, 255, 0.8)"
      strokeWidth={1 / zoom}
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
 * far joined by straight sides, or by the rounded path they will get when
 * smoothing is on, a dashed line from the last corner to the grid crossing
 * under the pointer, a ring on that crossing, and a dot on every corner.
 * The first dot grows once the shape can be closed.
 */
export function DrawPreview({ points, hover, options, zoom }: DrawPreviewProps) {
  const count = points.length / 2;
  const last = count > 0 ? { x: points[points.length - 2], y: points[points.length - 1] } : null;
  const canClose = options.closed && count >= 3;
  const dots: Point[] = [];
  for (let index = 0; index < points.length; index += 2) dots.push({ x: points[index], y: points[index + 1] });
  const rubber = last && hover ? (canClose ? [last.x, last.y, hover.x, hover.y, points[0], points[1]] : [last.x, last.y, hover.x, hover.y]) : [];

  return (
    <>
      {count >= 2 && options.smooth ? (
        <>
          <Path data={roundedPolygonPath(points, smoothRadius(options), false)} stroke={HALO} strokeWidth={4 / zoom} lineJoin="round" lineCap="round" listening={false} />
          <Path data={roundedPolygonPath(points, smoothRadius(options), false)} stroke={ACCENT} strokeWidth={2 / zoom} lineJoin="round" lineCap="round" listening={false} />
        </>
      ) : null}
      {count >= 2 && !options.smooth ? (
        <>
          <Line points={points} stroke={HALO} strokeWidth={4 / zoom} lineJoin="round" lineCap="round" listening={false} />
          <Line points={points} stroke={ACCENT} strokeWidth={2 / zoom} lineJoin="round" lineCap="round" listening={false} />
        </>
      ) : null}
      {last && hover ? (
        <>
          <Line points={rubber} stroke={HALO} strokeWidth={3 / zoom} listening={false} />
          <Line points={rubber} stroke={ACCENT} strokeWidth={1 / zoom} dash={[6 / zoom, 4 / zoom]} listening={false} />
        </>
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
