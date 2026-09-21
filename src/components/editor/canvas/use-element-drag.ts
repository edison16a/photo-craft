"use client";
/**
 * Dragging one or many selected elements together, with alignment guides.
 *
 * Konva moves the grabbed node on its own. On every move we work out how
 * far it went, snap the whole selection's box to the page and to other
 * elements, then place every selected node at the snapped offset. On drag
 * end the new positions go into the store as one undo step.
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

interface DragSession {
  startPositions: Map<string, Point>;
  startBounds: Rect;
  targets: Rect[];
}

/** Screen pixels within which an edge snaps. Divided by zoom on use. */
export const SNAP_THRESHOLD_PX = 6;

let session: DragSession | null = null;

function sameGuides(a: Guide[], b: Guide[]): boolean {
  return a.length === b.length && a.every((g, i) => g.orientation === b[i].orientation && g.position === b[i].position);
}

function findNode(layer: Konva.Layer | null, id: string): Konva.Node | undefined {
  return layer?.findOne(`#${id}`) ?? undefined;
}

export function useElementDrag() {
  return useMemo(() => {
    const onDragStart = (event: KonvaEventObject<DragEvent>) => {
      const node = event.target;
      const id = node.id();
      const state = useProjectStore.getState();
      const elements = selectCurrentElements(state);
      const selected = state.selectedIds.includes(id) ? state.selectedIds : [id];
      if (!state.selectedIds.includes(id)) state.setSelection([id]);

      const moving = elements.filter((el) => selected.includes(el.id) && !el.locked);
      const movingIds = new Set(moving.map((el) => el.id));
      const layer = node.getLayer();
      const startPositions = new Map<string, Point>();
      for (const el of moving) {
        const target = findNode(layer, el.id);
        if (target) startPositions.set(el.id, target.position());
      }
      session = {
        startPositions,
        startBounds: unionRects(moving.map(elementBounds)),
        targets: elements.filter((el) => !movingIds.has(el.id)).map(elementBounds),
      };
    };

    const onDragMove = (event: KonvaEventObject<DragEvent>) => {
      const node = event.target;
      const start = session?.startPositions.get(node.id());
      const project = useProjectStore.getState().project;
      if (!session || !start || !project) return;

      const delta = { x: node.x() - start.x, y: node.y() - start.y };
      const ui = useEditorUiStore.getState();
      const moved = { ...session.startBounds, x: session.startBounds.x + delta.x, y: session.startBounds.y + delta.y };
      const snap = computeSnap(moved, {
        pageWidth: project.width,
        pageHeight: project.height,
        targets: session.targets,
        threshold: SNAP_THRESHOLD_PX / ui.zoom,
      });

      const layer = node.getLayer();
      for (const [id, origin] of session.startPositions) {
        findNode(layer, id)?.position({ x: origin.x + delta.x + snap.dx, y: origin.y + delta.y + snap.dy });
      }
      if (!sameGuides(ui.guides, snap.guides)) ui.setGuides(snap.guides);
    };

    const onDragEnd = (event: KonvaEventObject<DragEvent>) => {
      if (!session) return;
      const layer = event.target.getLayer();
      const patches: Record<string, { x: number; y: number }> = {};
      for (const id of session.startPositions.keys()) {
        const target = findNode(layer, id);
        if (target) patches[id] = { x: Math.round(target.x() * 100) / 100, y: Math.round(target.y() * 100) / 100 };
      }
      session = null;
      useEditorUiStore.getState().setGuides([]);
      useProjectStore.getState().patchElements(patches);
    };

    return { onDragStart, onDragMove, onDragEnd };
  }, []);
}
