/**
 * Transient editor UI state: the active tool, which side panel is open,
 * zoom and pan, in place text editing, alignment guides and toasts.
 * None of this is saved with the project.
 */
import { create } from "zustand";
import type { Guide } from "../lib/snapping";
import type { Point } from "../model/types";

/** The tools in the left rail. */
export type Tool = "select" | "text" | "shapes" | "upload" | "elements";
/** The panels the right side can show. */
export type PanelKind = "properties" | "page" | "text" | "shapes" | "upload" | "elements";

/** A short message shown at the bottom of the editor. */
export interface Toast {
  message: string;
  kind: "info" | "error";
}

/** State and actions of the editor UI store. */
export interface EditorUiState {
  tool: Tool;
  panel: PanelKind;
  zoom: number;
  pan: Point;
  /** Size of the workspace in screen pixels, kept current by a resize observer. */
  viewportSize: { width: number; height: number };
  editingTextId: string | null;
  guides: Guide[];
  toast: Toast | null;
  exportOpen: boolean;

  setTool: (tool: Tool) => void;
  openPanel: (panel: PanelKind) => void;
  setViewport: (zoom: number, pan: Point) => void;
  setViewportSize: (size: { width: number; height: number }) => void;
  setEditingText: (id: string | null) => void;
  setGuides: (guides: Guide[]) => void;
  showToast: (message: string, kind?: Toast["kind"]) => void;
  hideToast: () => void;
  setExportOpen: (open: boolean) => void;
}

/** Smallest zoom the workspace allows. */
export const MIN_ZOOM = 0.05;
/** Largest zoom the workspace allows. */
export const MAX_ZOOM = 8;

/** Panel that belongs to each tool, so picking a tool opens the right one. */
const PANEL_FOR_TOOL: Record<Tool, PanelKind> = {
  select: "page",
  text: "text",
  shapes: "shapes",
  upload: "upload",
  elements: "elements",
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;

/** Store for editor UI state that is not part of the project. */
export const useEditorUiStore = create<EditorUiState>()((set) => ({
  tool: "select",
  panel: "page",
  zoom: 1,
  pan: { x: 0, y: 0 },
  viewportSize: { width: 0, height: 0 },
  editingTextId: null,
  guides: [],
  toast: null,
  exportOpen: false,

  setTool: (tool) => set({ tool, panel: PANEL_FOR_TOOL[tool] }),
  openPanel: (panel) => set({ panel }),
  setViewport: (zoom, pan) =>
    set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)), pan }),
  setViewportSize: (viewportSize) => set({ viewportSize }),
  setEditingText: (id) => set({ editingTextId: id }),
  setGuides: (guides) => set({ guides }),
  showToast: (message, kind = "info") => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { message, kind } });
    toastTimer = setTimeout(() => set({ toast: null }), kind === "error" ? 5000 : 2500);
  },
  hideToast: () => set({ toast: null }),
  setExportOpen: (open) => set({ exportOpen: open }),
}));
