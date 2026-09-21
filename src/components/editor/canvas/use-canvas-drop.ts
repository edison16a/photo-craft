"use client";
/**
 * Drops and pastes onto the workspace. Handles files from the desktop,
 * images dragged from a Google Images tab, dragged search results and
 * images or image links in the clipboard.
 */
import { useCallback, useEffect, type DragEvent, type RefObject } from "react";
import { useAddElement } from "@/hooks/use-add-element";
import { extractDropPayload, looksLikeImageUrl } from "@/lib/drop-payload";
import type { Point } from "@/model/types";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function useCanvasDrop(containerRef: RefObject<HTMLDivElement | null>, toPagePoint: (screen: Point) => Point) {
  const { addImageFile, addImageUrl } = useAddElement();

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const payload = extractDropPayload(event.dataTransfer);
      const bounds = containerRef.current?.getBoundingClientRect();
      const at = bounds
        ? toPagePoint({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
        : undefined;
      for (const file of payload.files) void addImageFile(file, at);
      if (payload.files.length === 0) {
        for (const url of payload.urls.slice(0, 1)) void addImageUrl(url, at);
      }
    },
    [containerRef, toPagePoint, addImageFile, addImageUrl],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const payload = extractDropPayload(event.clipboardData);
      if (payload.files.length > 0) {
        event.preventDefault();
        for (const file of payload.files) void addImageFile(file);
        return;
      }
      const url = payload.urls.find(looksLikeImageUrl);
      if (url) {
        event.preventDefault();
        void addImageUrl(url);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImageFile, addImageUrl]);

  return { onDragOver, onDrop };
}
