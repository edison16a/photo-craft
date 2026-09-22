"use client";
/**
 * Dragging one or many selected elements together, with alignment guides.
 *
 * The delta comes from the pointer, not from node positions. Konva's
 * transformer also nudges the other attached nodes and starts drags on
 * them, which fires extra dragstart and dragmove events; measuring the
 * pointer keeps every node exactly where the grabbed one says it should
 * be. On drag end the new positions go into the store as one undo step.
 */
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useMemo } from "react";
import { unionRects } from "@/lib/geometry";
import { computeSnap, type Guide } from "@/lib/snapping";
import type { Point, Rect } from "@/model/types";
import { elementBounds } from "@/store/alignment";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";
import { screenToPage } from "@/store/viewport-actions";

interface DragSession {
  /** Where the pointer was when the drag began, in page pixels. */
  pointerStart: Point;
  /** Top left corner and size of every moving element when the drag began. */
  start: Map<string, Rect>;
  startBounds: Rect;
  targets: Rect[];
  /** Latest snapped top left corner per element, written on every move. */
  latest: Map<string, Point>;
}

/** Screen pixels within which an edge snaps. Divided by zoom on use. */
export const SNAP_THRESHOLD_PX = 6;

let session: DragSession | null = null;
/** Where the pointer went down on an element, in page pixels. */
let pressPointer: Point | null = null;

function sameGuides(a: Guide[], b: Guide[]): boolean {
  return a.length === b.length && a.every((g, i) => g.orientation === b[i].orientation && g.position === b[i].position);
}

function pagePointer(node: Konva.Node): Point | null {
  const pointer = node.getStage()?.getPointerPosition();
  return pointer ? screenToPage(pointer) : null;
}

/**
 * Records the mousedown position on an element. Konva only fires dragstart
 * after the pointer has moved a few pixels, so this is the true origin of
 * the drag and keeps elements from lagging behind the pointer.
 */
export function rememberPressPointer(node: Konva.Node): void {
  pressPointer = pagePointer(node);
}

/** Drag handlers for element groups. Share one instance across all elements. */
export function useElementDrag() {
  return useMemo(() => {
    const onDragStart = (event: KonvaEventObject<DragEvent>) => {
      // The transformer starts drags on the other selected nodes. Ignore those.
      if (session) return;
      const node = event.target;
      const id = node.id();
      const pointer = pagePointer(node);
      const state = useProjectStore.getState();
      if (!pointer) return;

      const elements = selectCurrentElements(state);
      const selected = state.selectedIds.includes(id) ? state.selectedIds : [id];
      if (!state.selectedIds.includes(id)) state.setSelection([id]);

      const moving = elements.filter((el) => selected.includes(el.id) && !el.locked);
      const movingIds = new Set(moving.map((el) => el.id));
      const start = new Map<string, Rect>();
      for (const el of moving) start.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height });

      useEditorUiStore.getState().setInteracting(true);
      session = {
        pointerStart: pressPointer ?? pointer,
        start,
        startBounds: unionRects(moving.map(elementBounds)),
        targets: elements.filter((el) => !movingIds.has(el.id)).map(elementBounds),
        latest: new Map(),
      };
    };

    const onDragMove = (event: KonvaEventObject<DragEvent>) => {
      const node = event.target;
      const project = useProjectStore.getState().project;
      const pointer = session ? pagePointer(node) : null;
      if (!session || !pointer || !project) return;

      const delta = { x: pointer.x - session.pointerStart.x, y: pointer.y - session.pointerStart.y };
      const ui = useEditorUiStore.getState();
      const moved = { ...session.startBounds, x: session.startBounds.x + delta.x, y: session.startBounds.y + delta.y };
      const snap = computeSnap(moved, {
        pageWidth: project.width,
        pageHeight: project.height,
        targets: session.targets,
        threshold: SNAP_THRESHOLD_PX / ui.zoom,
      });

      const layer = node.getLayer();
      for (const [id, box] of session.start) {
        const topLeft = { x: box.x + delta.x + snap.dx, y: box.y + delta.y + snap.dy };
        session.latest.set(id, topLeft);
        // Node positions are box centres, see groupAttrs.
        layer?.findOne(`#${id}`)?.position({ x: topLeft.x + box.width / 2, y: topLeft.y + box.height / 2 });
      }
      if (!sameGuides(ui.guides, snap.guides)) ui.setGuides(snap.guides);
    };

    const onDragEnd = () => {
      // Every dragged node fires dragend. The first one commits for all of them.
      if (!session) return;
      const patches: Record<string, { x: number; y: number }> = {};
      for (const [id, topLeft] of session.latest) {
        patches[id] = { x: Math.round(topLeft.x * 100) / 100, y: Math.round(topLeft.y * 100) / 100 };
      }
      session = null;
      pressPointer = null;
      useEditorUiStore.getState().setGuides([]);
      useEditorUiStore.getState().setInteracting(false);
      useProjectStore.getState().patchElements(patches);
    };

    return { onDragStart, onDragMove, onDragEnd };
  }, []);
}
