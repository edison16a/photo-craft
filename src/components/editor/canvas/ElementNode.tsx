"use client";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group } from "react-konva";
import { blurActiveField } from "@/lib/focus";
import { flipAttrs, groupAttrs } from "@/lib/konva/element-attrs";
import type { CanvasElement } from "@/model/types";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { clickElement, doubleClickElement, pressElement } from "@/store/element-clicks";
import { ImageNode } from "./ImageNode";
import { pointerInput } from "./pointer-input";
import { ShapeNode } from "./ShapeNode";
import { TextNode } from "./TextNode";
import { rememberPressPointer, useElementDrag } from "./use-element-drag";

interface ElementNodeProps {
  element: CanvasElement;
}

type KonvaPointerEvent = KonvaEventObject<MouseEvent | TouchEvent>;

/**
 * Wraps an element in two groups. The outer one carries position, rotation
 * and opacity and is what the transformer attaches to. The inner one only
 * flips, so flipping never confuses resize maths. Presses, clicks and
 * double clicks go to element-clicks, which decides the selection.
 */
export function ElementNode({ element }: ElementNodeProps) {
  const drag = useElementDrag();
  const tool = useEditorUiStore((s) => s.tool);
  const canDrag = !element.locked && tool === "select";

  const onPress = (event: KonvaPointerEvent) => {
    if (tool !== "select") return;
    event.cancelBubble = true;
    blurActiveField();
    rememberPressPointer(event.target);
    const input = pointerInput(event, element.id);
    if (input) pressElement(input);
  };

  const onClick = (event: KonvaPointerEvent) => {
    if (tool !== "select") return;
    const input = pointerInput(event, element.id);
    if (input) clickElement(input);
  };

  const onDblClick = () => {
    if (tool === "select") doubleClickElement(element.id);
  };

  return (
    <Group
      id={element.id}
      name="element"
      {...groupAttrs(element)}
      draggable={canDrag}
      onMouseDown={onPress}
      onTouchStart={onPress}
      onClick={onClick}
      onTap={onClick}
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
