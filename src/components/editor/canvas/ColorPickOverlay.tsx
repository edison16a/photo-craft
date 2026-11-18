"use client";
import { useEffect, useState, type RefObject } from "react";
import { peekCachedImage } from "@/lib/image-cache";
import { sampleImageAt } from "@/lib/pixel-sample";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";
import { screenToPage } from "@/store/viewport-actions";

interface ColorPickOverlayProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

interface Hover {
  left: number;
  top: number;
  color: string;
}

/**
 * The swatch that follows the pointer while a chroma key colour is being
 * picked. It shows the picture's own colour under the pointer, before any
 * key, and hides off the picture. It listens on the workspace itself so
 * pointer moves never re-render the stage.
 */
export function ColorPickOverlay({ containerRef }: ColorPickOverlayProps) {
  const pickingFor = useEditorUiStore((s) => s.pickingColorFor);
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !pickingFor) return;
    const onMove = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLCanvasElement)) return setHover(null);
      const box = node.getBoundingClientRect();
      const screen = { x: event.clientX - box.left, y: event.clientY - box.top };
      const element = selectCurrentElements(useProjectStore.getState()).find((candidate) => candidate.id === pickingFor);
      const image = element?.type === "image" ? peekCachedImage(element.src) : undefined;
      const sample = element?.type === "image" && image ? sampleImageAt(element, image, screenToPage(screen)) : null;
      setHover(sample && sample.alpha > 0 ? { left: screen.x, top: screen.y, color: sample.color } : null);
    };
    const onLeave = () => setHover(null);
    node.addEventListener("mousemove", onMove);
    node.addEventListener("mouseleave", onLeave);
    return () => {
      node.removeEventListener("mousemove", onMove);
      node.removeEventListener("mouseleave", onLeave);
      setHover(null);
    };
  }, [containerRef, pickingFor]);

  if (!pickingFor || !hover) return null;
  return <div className="pick-swatch" style={{ left: hover.left, top: hover.top, background: hover.color }} aria-hidden="true" />;
}
