"use client";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group } from "react-konva";
import { blurActiveField } from "@/lib/focus";
import { flipAttrs, groupAttrs } from "@/lib/konva/element-attrs";
import type { CanvasElement } from "@/model/types";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { clickElement, doubleClickElement, pressElement, type PointerInput } from "@/store/element-clicks";
import { screenToPage } from "@/store/viewport-actions";
import { ImageNode } from "./ImageNode";
import { ShapeNode } from "./ShapeNode";
import { TextNode } from "./TextNode";
import { rememberPressPointer, useElementDrag } from "./use-element-drag";

interface ElementNodeProps {
  element: CanvasElement;
}

type KonvaPointerEvent = KonvaEventObject<MouseEvent | TouchEvent>;

/** What element-clicks needs to know about a Konva pointer event. */
function pointerInput(event: KonvaPointerEvent, id: string): PointerInput | null {
  const pointer = event.target.getStage()?.getPointerPosition();
  if (!pointer) return null;
  const evt = event.evt;
  return {
    id,
    point: screenToPage(pointer),
    button: "button" in evt ? evt.button : 0,
    shift: evt.shiftKey,
    mod: evt.ctrlKey || evt.metaKey,
  };
}

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
