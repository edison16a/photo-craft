"use client";
import { useEffect, useRef, useState } from "react";
import { unionRects } from "@/lib/geometry";
import { positionToolbar } from "@/lib/toolbar-position";
import { elementBounds } from "@/store/alignment";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";
import { CommonQuickActions } from "./quick/CommonQuickActions";
import { ImageQuickActions } from "./quick/ImageQuickActions";
import { MultiQuickActions } from "./quick/MultiQuickActions";
import { ShapeQuickActions } from "./quick/ShapeQuickActions";
import { TextQuickActions } from "./quick/TextQuickActions";

/**
 * Floating toolbar above the selection with the options people reach for
 * most, so the side panel is only needed for the rest. Hidden while the
 * selection is being dragged or resized and while text is being edited.
 */
export function QuickToolbar() {
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const elements = useProjectStore(selectCurrentElements);
  const tool = useEditorUiStore((s) => s.tool);
  const editing = useEditorUiStore((s) => s.editingTextId);
  const interacting = useEditorUiStore((s) => s.interacting);
  const zoom = useEditorUiStore((s) => s.zoom);
  const pan = useEditorUiStore((s) => s.pan);
  const workspace = useEditorUiStore((s) => s.viewportSize);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const selected = elements.filter((el) => selectedIds.includes(el.id));
  const visible = tool === "select" && selected.length > 0 && !editing && !interacting;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, selected.length]);

  if (!visible) return null;

  const bounds = unionRects(selected.map(elementBounds));
  const box = {
    x: pan.x + bounds.x * zoom,
    y: pan.y + bounds.y * zoom,
    width: bounds.width * zoom,
    height: bounds.height * zoom,
  };
  const placement = positionToolbar(box, size, workspace);
  const single = selected.length === 1 ? selected[0] : null;

  return (
    <div
      ref={ref}
      className="quick-toolbar"
      role="toolbar"
      aria-label="Quick actions"
      style={{ top: placement.top, left: placement.left, visibility: size.width > 0 ? "visible" : "hidden" }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {single?.type === "text" ? <TextQuickActions element={single} /> : null}
      {single?.type === "shape" ? <ShapeQuickActions element={single} /> : null}
      {single?.type === "image" ? <ImageQuickActions element={single} /> : null}
      {!single ? <MultiQuickActions elements={selected} /> : null}
      <CommonQuickActions elements={selected} />
    </div>
  );
}
