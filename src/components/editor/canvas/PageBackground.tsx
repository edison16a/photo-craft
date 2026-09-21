"use client";
import { useMemo } from "react";
import { Rect } from "react-konva";

interface PageBackgroundProps {
  width: number;
  height: number;
  background: string;
}

/** Name used by the stage to recognise clicks on empty page area. */
export const PAGE_BACKGROUND_NAME = "page-background";

/** Small grey and white checkerboard tile for transparent pages. */
function makeCheckerboard(): HTMLCanvasElement | undefined {
  if (typeof document === "undefined") return undefined;
  const tile = document.createElement("canvas");
  tile.width = 16;
  tile.height = 16;
  const ctx = tile.getContext("2d");
  if (!ctx) return undefined;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = "#d9dde3";
  ctx.fillRect(0, 0, 8, 8);
  ctx.fillRect(8, 8, 8, 8);
  return tile;
}

/** The page itself: a filled rectangle with a soft shadow, or a checkerboard when transparent. */
export function PageBackground({ width, height, background }: PageBackgroundProps) {
  const checker = useMemo(makeCheckerboard, []);
  const transparent = background === "transparent";
  return (
    <Rect
      name={PAGE_BACKGROUND_NAME}
      x={0}
      y={0}
      width={width}
      height={height}
      fill={transparent ? undefined : background}
      fillPatternImage={transparent ? (checker as unknown as HTMLImageElement) : undefined}
      fillPatternRepeat="repeat"
      shadowColor="#000000"
      shadowBlur={16}
      shadowOpacity={0.18}
      shadowOffsetY={4}
    />
  );
}
