"use client";
import { Image as KonvaImage, Rect } from "react-konva";
import { useHtmlImage } from "@/hooks/use-html-image";
import { imageAttrs } from "@/lib/konva/element-attrs";
import type { ImageElement } from "@/model/types";

interface ImageNodeProps {
  element: ImageElement;
}

/** Bitmap on the canvas. Shows a flat placeholder until the image decodes. */
export function ImageNode({ element }: ImageNodeProps) {
  const image = useHtmlImage(element.src);
  if (!image) {
    return <Rect {...imageAttrs(element)} fill="#c9ced6" />;
  }
  return <KonvaImage image={image} {...imageAttrs(element)} />;
}
