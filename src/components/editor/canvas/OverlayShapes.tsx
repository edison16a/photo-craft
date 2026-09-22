"use client";
import { Line, Rect } from "react-konva";
import { groupAttrs } from "@/lib/konva/element-attrs";
import type { Guide } from "@/lib/snapping";
import type { CanvasElement, Rect as RectShape } from "@/model/types";

const ACCENT = "#2b8cff";

interface GuideLinesProps {
  guides: Guide[];
  pageWidth: number;
  pageHeight: number;
  zoom: number;
}

/** Thin blue alignment lines drawn across the page while dragging. */
export function GuideLines({ guides, pageWidth, pageHeight, zoom }: GuideLinesProps) {
  return (
    <>
      {guides.map((guide, index) => (
        <Line
          key={`${guide.orientation}-${guide.position}-${index}`}
          points={
            guide.orientation === "vertical"
              ? [guide.position, -pageHeight * 0.1, guide.position, pageHeight * 1.1]
              : [-pageWidth * 0.1, guide.position, pageWidth * 1.1, guide.position]
          }
          stroke={ACCENT}
          strokeWidth={1 / zoom}
          dash={[6 / zoom, 4 / zoom]}
          listening={false}
        />
      ))}
    </>
  );
}

interface MarqueeRectProps {
  rect: RectShape | null;
  zoom: number;
}

/** The rubber band shown while dragging on empty space. */
export function MarqueeRect({ rect, zoom }: MarqueeRectProps) {
  if (!rect) return null;
  return (
    <Rect
      {...rect}
      fill="rgba(43, 140, 255, 0.12)"
      stroke={ACCENT}
      strokeWidth={1 / zoom}
      listening={false}
    />
  );
}

interface LockedOutlinesProps {
  elements: CanvasElement[];
  zoom: number;
}

/** Dashed outline around selected elements that are locked. */
export function LockedOutlines({ elements, zoom }: LockedOutlinesProps) {
  return (
    <>
      {elements.map((element) => (
        <Rect
          key={element.id}
          {...groupAttrs({ ...element, opacity: 1 })}
          width={element.width}
          height={element.height}
          stroke="#9aa3b2"
          strokeWidth={1.5 / zoom}
          dash={[6 / zoom, 4 / zoom]}
          listening={false}
        />
      ))}
    </>
  );
}
