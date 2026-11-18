"use client";
import { Image as KonvaImage, Rect } from "react-konva";
import { useHtmlImage } from "@/hooks/use-html-image";
import { imageAttrs } from "@/lib/konva/element-attrs";
import { filteredImage } from "@/lib/konva/filtered-image";
import type { ImageElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";

interface ImageNodeProps {
  element: ImageElement;
}

/**
 * Bitmap on the canvas, with its chroma key and colour applied. While a
 * slider or picker previews a change it draws a quicker, smaller copy,
 * then the full one once the change is committed. Shows a flat
 * placeholder until the image decodes.
 */
export function ImageNode({ element }: ImageNodeProps) {
  const image = useHtmlImage(element.src);
  const previewing = useProjectStore((s) => s.previewBase !== null);
  if (!image) {
    return <Rect {...imageAttrs(element)} fill="#c9ced6" />;
  }
  return <KonvaImage image={filteredImage(image, element, { draft: previewing })} {...imageAttrs(element)} />;
}
