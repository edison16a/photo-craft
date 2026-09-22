/**
 * Where to put the floating toolbar for a selection.
 *
 * It floats above the selection's box, centred on it. When the box is too
 * close to the top of the workspace it moves below the box, and it is
 * always kept inside the workspace with a small padding.
 */
import type { Rect } from "../model/types";

export interface Size {
  width: number;
  height: number;
}

/** Space between the toolbar and the selection box. */
export const TOOLBAR_GAP = 12;
/** Space kept between the toolbar and the workspace edge. */
export const WORKSPACE_PADDING = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Top left corner for the toolbar, given the selection box in workspace pixels. */
export function positionToolbar(selection: Rect, toolbar: Size, workspace: Size): { top: number; left: number } {
  let top = selection.y - TOOLBAR_GAP - toolbar.height;
  if (top < WORKSPACE_PADDING) top = selection.y + selection.height + TOOLBAR_GAP;
  top = clamp(top, WORKSPACE_PADDING, workspace.height - toolbar.height - WORKSPACE_PADDING);
  const left = clamp(
    selection.x + selection.width / 2 - toolbar.width / 2,
    WORKSPACE_PADDING,
    workspace.width - toolbar.width - WORKSPACE_PADDING,
  );
  return { top, left };
}
