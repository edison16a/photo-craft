"use client";
import { Image as KonvaImage, Rect } from "react-konva";
import { useHtmlImage } from "@/hooks/use-html-image";
import { imageAttrs } from "@/lib/konva/element-attrs";
import { filteredImage } from "@/lib/konva/filtered-image";
import type { ImageElement } from "@/model/types";

interface ImageNodeProps {
  element: ImageElement;
}

/** Bitmap on the canvas, with its colour changes applied. Shows a flat placeholder until the image decodes. */
export function ImageNode({ element }: ImageNodeProps) {
  const image = useHtmlImage(element.src);
  if (!image) {
    return <Rect {...imageAttrs(element)} fill="#c9ced6" />;
  }
  return <KonvaImage image={filteredImage(image, element)} {...imageAttrs(element)} />;
}
