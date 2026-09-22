"use client";
/**
 * Dropping pictures anywhere on the remove background page and pasting
 * them from the clipboard. Files win over links when both arrive.
 */
import { useCallback, useEffect, useState, type DragEvent } from "react";
import { extractDropPayload, looksLikeImageUrl } from "../lib/drop-payload";
import { isTypingTarget } from "../lib/typing-target";

interface PictureHandlers {
  addFiles: (files: File[]) => void;
  addUrls: (urls: string[]) => void;
}

/** Drag handlers for the page element, a window paste listener, and whether a drag is over the page. */
export function usePictureDrop({ addFiles, addUrls }: PictureHandlers) {
  const [dragActive, setDragActive] = useState(false);

  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    // Leaving a child fires too; only a leave of the page itself counts.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragActive(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragActive(false);
      const payload = extractDropPayload(event.dataTransfer);
      if (payload.files.length > 0) addFiles(payload.files);
      else addUrls(payload.urls.filter(looksLikeImageUrl).slice(0, 1));
    },
    [addFiles, addUrls],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const payload = extractDropPayload(event.clipboardData);
      if (payload.files.length > 0) {
        event.preventDefault();
        addFiles(payload.files);
        return;
      }
      const url = payload.urls.find(looksLikeImageUrl);
      if (url) {
        event.preventDefault();
        addUrls([url]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles, addUrls]);

  return { onDragOver, onDragLeave, onDrop, dragActive };
}
