"use client";
import { Arrow, Ellipse, Line, Rect } from "react-konva";
import { shapeNodeSpec } from "@/lib/konva/element-attrs";
import type { ShapeElement } from "@/model/types";

interface ShapeNodeProps {
  element: ShapeElement;
}

/** One of the simple shapes, picked from the shared attribute builder. */
export function ShapeNode({ element }: ShapeNodeProps) {
  const spec = shapeNodeSpec(element);
  switch (spec.node) {
    case "rect":
      return <Rect {...spec.attrs} />;
    case "ellipse":
      return <Ellipse {...(spec.attrs as { radiusX: number; radiusY: number })} />;
    case "arrow":
      return <Arrow {...(spec.attrs as { points: number[] })} />;
    default:
      return <Line {...(spec.attrs as { points: number[] })} />;
  }
}
