"use client";
import type Konva from "konva";
import { useEffect, useRef } from "react";
import { Text } from "react-konva";
import { ensureFontLoaded } from "@/lib/font-loader";
import { textAttrs } from "@/lib/konva/element-attrs";
import type { TextElement } from "@/model/types";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";

interface TextNodeProps {
  element: TextElement;
}

/**
 * Text on the canvas. Height follows the content, so after every render we
 * measure the node and store the height quietly for the properties panel,
 * alignment and snapping. Hidden while the text is being edited in place.
 */
export function TextNode({ element }: TextNodeProps) {
  const ref = useRef<Konva.Text>(null);
  const editing = useEditorUiStore((s) => s.editingTextId === element.id);

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      const node = ref.current;
      if (!node || cancelled) return;
      node.getLayer()?.batchDraw();
      const height = Math.round(node.height() * 100) / 100;
      if (Math.abs(height - element.height) > 0.5) {
        useProjectStore.getState().syncElementSize(element.id, { height });
      }
    };
    measure();
    void ensureFontLoaded(element.fontFamily).then(measure);
    return () => {
      cancelled = true;
    };
  }, [element.id, element.height, element.text, element.fontFamily, element.fontSize, element.fontWeight,
      element.fontStyle, element.width, element.lineHeight, element.letterSpacing]);

  return <Text ref={ref} {...textAttrs(element)} visible={!editing} />;
}
