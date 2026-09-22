"use client";
import { Arrow, Ellipse, Line, Path, Rect } from "react-konva";
import { shapeNodeSpec } from "@/lib/konva/element-attrs";
import type { ShapeElement } from "@/model/types";

interface ShapeNodeProps {
  element: ShapeElement;
}

/**
 * One of the simple shapes, picked from the shared attribute builder.
 *
 * Lines and arrows are flat, so on their own the group would measure zero
 * height and the transformer could not resize them. An invisible box the
 * size of the element sits underneath them to give the group its bounds.
 */
export function ShapeNode({ element }: ShapeNodeProps) {
  const spec = shapeNodeSpec(element);
  switch (spec.node) {
    case "rect":
      return <Rect {...spec.attrs} />;
    case "ellipse":
      return <Ellipse {...(spec.attrs as { radiusX: number; radiusY: number })} />;
    case "path":
      return <Path {...(spec.attrs as { data: string })} />;
    case "arrow":
      return (
        <>
          <Rect width={element.width} height={element.height} listening={false} />
          <Arrow {...(spec.attrs as { points: number[] })} hitStrokeWidth={HIT_STROKE_WIDTH} />
        </>
      );
    default:
      return (
        <>
          {element.shape === "line" ? <Rect width={element.width} height={element.height} listening={false} /> : null}
          <Line {...(spec.attrs as { points: number[] })} hitStrokeWidth={element.shape === "line" ? HIT_STROKE_WIDTH : undefined} />
        </>
      );
  }
}

/** Thin lines get a wider hit area so they are easy to grab. */
const HIT_STROKE_WIDTH = 24;
