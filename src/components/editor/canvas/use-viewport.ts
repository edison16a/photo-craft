"use client";
/**
 * Keeps the workspace size in the UI store, fits the page when a project
 * opens, and turns wheel events into pan or zoom.
 */
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, type RefObject } from "react";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { panBy, zoomBy, zoomToFit } from "@/store/viewport-actions";

export function useViewport(containerRef: RefObject<HTMLDivElement | null>) {
  const size = useEditorUiStore((s) => s.viewportSize);
  const zoom = useEditorUiStore((s) => s.zoom);
  const pan = useEditorUiStore((s) => s.pan);
  const projectId = useProjectStore((s) => s.project?.id);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      useEditorUiStore.getState().setViewportSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  const ready = size.width > 0 && size.height > 0;
  useEffect(() => {
    if (ready && projectId) zoomToFit();
  }, [ready, projectId]);

  const onWheel = useCallback((event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    if (event.evt.ctrlKey || event.evt.metaKey) {
      const stage = event.target.getStage() as Konva.Stage | null;
      zoomBy(Math.exp(-event.evt.deltaY * 0.01), stage?.getPointerPosition() ?? undefined);
      return;
    }
    panBy(-event.evt.deltaX, -event.evt.deltaY);
  }, []);

  return { size, zoom, pan, onWheel };
}
