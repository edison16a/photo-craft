"use client";
import { useEffect, useRef } from "react";
import { useHtmlImage } from "@/hooks/use-html-image";
import { filteredImage } from "@/lib/konva/filtered-image";
import type { ImageElement } from "@/model/types";

interface KeyedImagePreviewProps {
  element: ImageElement;
  /** Longest side on screen, in CSS pixels. */
  size: number;
}

/**
 * A small drawing of an image with its chroma key and flat colour
 * applied, for the selection preview. It draws from the same copy as the
 * canvas, or a quick draft of it, so it never keys the picture again at
 * full size.
 */
export function KeyedImagePreview({ element, size }: KeyedImagePreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const image = useHtmlImage(element.src);
  const scale = size / Math.max(1, element.naturalWidth, element.naturalHeight);
  const width = Math.max(1, Math.round(element.naturalWidth * scale));
  const height = Math.max(1, Math.round(element.naturalHeight * scale));

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !image) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(filteredImage(image, element, { draft: true }), 0, 0, canvas.width, canvas.height);
  }, [image, element, width, height]);

  const flip = `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`;
  return <canvas ref={ref} style={{ width, height, transform: flip }} aria-hidden="true" />;
}
