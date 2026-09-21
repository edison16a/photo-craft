/**
 * Zoom and pan actions that any part of the editor can call: the top bar,
 * keyboard shortcuts and the canvas itself. They read the workspace size
 * and the project size from the stores.
 */
import { fitScale } from "../lib/geometry";
import type { Point } from "../model/types";
import { MAX_ZOOM, MIN_ZOOM, useEditorUiStore } from "./editor-ui-store";
import { useProjectStore } from "./project-store";

const FIT_PADDING = 48;
const ZOOM_STEP = 1.2;
/** Never zoom past this when fitting, small pages look silly blown up. */
const MAX_FIT_ZOOM = 1.5;

/** Centres the page and picks a zoom so the whole page is visible. */
export function zoomToFit(): void {
  const project = useProjectStore.getState().project;
  const { viewportSize, setViewport } = useEditorUiStore.getState();
  if (!project || viewportSize.width === 0 || viewportSize.height === 0) return;
  const zoom = Math.min(
    MAX_FIT_ZOOM,
    fitScale(project.width, project.height, viewportSize.width, viewportSize.height, FIT_PADDING),
  );
  setViewport(zoom, {
    x: (viewportSize.width - project.width * zoom) / 2,
    y: (viewportSize.height - project.height * zoom) / 2,
  });
}

/** Multiplies the zoom, keeping a screen point (or the centre) where it is. */
export function zoomBy(factor: number, around?: Point): void {
  const { zoom, pan, viewportSize, setViewport } = useEditorUiStore.getState();
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
  const centre = around ?? { x: viewportSize.width / 2, y: viewportSize.height / 2 };
  const ratio = next / zoom;
  setViewport(next, {
    x: centre.x - (centre.x - pan.x) * ratio,
    y: centre.y - (centre.y - pan.y) * ratio,
  });
}

/** Sets an exact zoom level around the centre of the workspace. */
export function zoomTo(level: number): void {
  const { zoom } = useEditorUiStore.getState();
  if (zoom > 0) zoomBy(level / zoom);
}

export function zoomIn(): void {
  zoomBy(ZOOM_STEP);
}

export function zoomOut(): void {
  zoomBy(1 / ZOOM_STEP);
}

/** Moves the view by a screen pixel offset. */
export function panBy(dx: number, dy: number): void {
  const { zoom, pan, setViewport } = useEditorUiStore.getState();
  setViewport(zoom, { x: pan.x + dx, y: pan.y + dy });
}

/** Converts a screen point inside the workspace to page pixels. */
export function screenToPage(screen: Point): Point {
  const { zoom, pan } = useEditorUiStore.getState();
  return { x: (screen.x - pan.x) / zoom, y: (screen.y - pan.y) / zoom };
}
