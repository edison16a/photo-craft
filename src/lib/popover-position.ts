/**
 * Where to put a popover so it stays on screen.
 *
 * The popover prefers to sit below its anchor, aligned to the anchor's left
 * edge. When there is more room above than below it flips up. When it would
 * run past the right edge it lines up with the anchor's right edge instead.
 * Finally it is clamped inside the viewport with a small padding.
 */

/** The rectangle of the element the popover belongs to, in viewport pixels. */
export interface AnchorRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Placement {
  top: number;
  left: number;
  side: "below" | "above";
}

/** Space kept between the popover and the anchor. */
export const POPOVER_GAP = 6;
/** Space kept between the popover and the viewport edge. */
export const VIEWPORT_PADDING = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Picks a top left corner and a side for the popover. */
export function positionPopover(anchor: AnchorRect, popover: Size, viewport: Size): Placement {
  const spaceBelow = viewport.height - anchor.bottom - VIEWPORT_PADDING;
  const spaceAbove = anchor.top - VIEWPORT_PADDING;
  const side: Placement["side"] = spaceBelow >= popover.height + POPOVER_GAP || spaceBelow >= spaceAbove ? "below" : "above";

  const wantedTop = side === "below" ? anchor.bottom + POPOVER_GAP : anchor.top - POPOVER_GAP - popover.height;
  const top = clamp(wantedTop, VIEWPORT_PADDING, viewport.height - popover.height - VIEWPORT_PADDING);

  let left = anchor.left;
  if (left + popover.width > viewport.width - VIEWPORT_PADDING) left = anchor.right - popover.width;
  left = clamp(left, VIEWPORT_PADDING, viewport.width - popover.width - VIEWPORT_PADDING);

  return { top, left, side };
}
