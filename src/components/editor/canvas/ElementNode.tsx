"use client";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group } from "react-konva";
import { blurActiveField } from "@/lib/focus";
import { flipAttrs, groupAttrs } from "@/lib/konva/element-attrs";
import type { CanvasElement } from "@/model/types";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { ImageNode } from "./ImageNode";
import { ShapeNode } from "./ShapeNode";
import { TextNode } from "./TextNode";
import { rememberPressPointer, useElementDrag } from "./use-element-drag";

interface ElementNodeProps {
  element: CanvasElement;
}

/**
 * Wraps an element in two groups. The outer one carries position, rotation
 * and opacity and is what the transformer attaches to. The inner one only
 * flips, so flipping never confuses resize maths.
 */
export function ElementNode({ element }: ElementNodeProps) {
  const drag = useElementDrag();
  const tool = useEditorUiStore((s) => s.tool);
  const canDrag = !element.locked && tool === "select";

  const onMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    if (tool !== "select") return;
    event.cancelBubble = true;
    blurActiveField();
    rememberPressPointer(event.target);
    const store = useProjectStore.getState();
    if (event.evt.shiftKey) {
      store.toggleSelected(element.id);
    } else if (!store.selectedIds.includes(element.id)) {
      store.setSelection([element.id]);
    }
  };

  const onDblClick = () => {
    if (element.type === "text" && !element.locked && tool === "select") {
      useEditorUiStore.getState().setEditingText(element.id);
    }
  };

  return (
    <Group
      id={element.id}
      name="element"
      {...groupAttrs(element)}
      draggable={canDrag}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown as unknown as (e: KonvaEventObject<TouchEvent>) => void}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      onDragStart={drag.onDragStart}
      onDragMove={drag.onDragMove}
      onDragEnd={drag.onDragEnd}
    >
      <Group {...flipAttrs(element)}>
        {element.type === "text" ? <TextNode element={element} /> : null}
        {element.type === "image" ? <ImageNode element={element} /> : null}
        {element.type === "shape" ? <ShapeNode element={element} /> : null}
      </Group>
    </Group>
  );
}
