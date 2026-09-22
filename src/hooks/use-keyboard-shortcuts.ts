"use client";
/**
 * Editor keyboard shortcuts. Ignored while typing in a form field or while
 * editing text on the canvas.
 */
import { useEffect } from "react";
import { useEditorUiStore } from "../store/editor-ui-store";
import { useProjectStore } from "../store/project-store";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export interface ShortcutHandlers {
  save: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (useEditorUiStore.getState().editingTextId) return;
      // A dialog owns the keyboard while it is open.
      if (document.querySelector('[aria-modal="true"]')) return;

      const store = useProjectStore.getState();
      const ids = store.selectedIds;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (!mod && !event.altKey && key === "v") return stop(event, () => useEditorUiStore.getState().setTool("select"));
      if (!mod && !event.altKey && key === "t") return stop(event, () => useEditorUiStore.getState().setTool("text"));

      if (mod && key === "z" && event.shiftKey) return stop(event, store.redo);
      if (mod && key === "z") return stop(event, store.undo);
      if (mod && key === "y") return stop(event, store.redo);
      if (mod && key === "s") return stop(event, handlers.save);
      if (mod && key === "a") return stop(event, store.selectAll);
      if (mod && key === "d") return stop(event, () => store.duplicateElements(ids));
      if (mod && key === "c") return ids.length > 0 ? stop(event, () => store.copy(ids)) : undefined;
      // Ctrl+V is left to the browser so the paste event fires. use-canvas-drop
      // handles both clipboard images and the internal element clipboard.
      if (mod && (key === "=" || key === "+")) return stop(event, handlers.zoomIn);
      if (mod && key === "-") return stop(event, handlers.zoomOut);
      if (mod && key === "0") return stop(event, handlers.zoomToFit);

      if (key === "escape") return stop(event, store.clearSelection);
      if ((key === "delete" || key === "backspace") && ids.length > 0) {
        return stop(event, () => store.removeElements(ids));
      }

      if (ids.length === 0) return;
      const step = event.shiftKey ? 10 : 1;
      if (key === "arrowleft") return stop(event, () => store.nudge(ids, -step, 0));
      if (key === "arrowright") return stop(event, () => store.nudge(ids, step, 0));
      if (key === "arrowup") return stop(event, () => store.nudge(ids, 0, -step));
      if (key === "arrowdown") return stop(event, () => store.nudge(ids, 0, step));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}

function stop(event: KeyboardEvent, action: () => void): void {
  event.preventDefault();
  action();
}
