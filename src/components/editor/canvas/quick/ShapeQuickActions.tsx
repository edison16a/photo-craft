"use client";
import type { ShapeElement } from "@/model/types";
import { useLiveElementUpdate } from "@/hooks/use-live-element-update";
import { ColorPicker } from "../../../ui/ColorPicker";
import { NumberField } from "../../../ui/NumberField";

interface ShapeQuickActionsProps {
  element: ShapeElement;
}

/** Fill, outline and corner radius for a shape. */
export function ShapeQuickActions({ element }: ShapeQuickActionsProps) {
  const live = useLiveElementUpdate([element.id]);
  const preview = (patch: Partial<ShapeElement>) => live.preview(patch);
  const update = (patch: Partial<ShapeElement>) => live.commit(patch);
  const strokeOnly = element.shape === "line" || element.shape === "arrow";
  return (
    <>
      {strokeOnly ? null : (
        <ColorPicker compact label="Fill" value={element.fill} allowTransparent onChange={(fill) => update({ fill })} onPreview={(fill) => preview({ fill })} />
      )}
      <ColorPicker
        compact
        label={strokeOnly ? "Colour" : "Outline"}
        value={element.stroke === "transparent" && strokeOnly ? element.fill : element.stroke}
        allowTransparent={!strokeOnly}
        onChange={(stroke) => update({ stroke })}
        onPreview={(stroke) => preview({ stroke })}
      />
      <NumberField compact label={strokeOnly ? "Thickness" : "Outline width"} value={element.strokeWidth} min={0} max={200}
        onPreview={(strokeWidth) => preview({ strokeWidth })} onCommit={(strokeWidth) => update({ strokeWidth })} />
      {element.shape === "rectangle" ? (
        <NumberField compact label="Corner radius" value={element.cornerRadius} min={0} max={1000}
          onPreview={(cornerRadius) => preview({ cornerRadius })} onCommit={(cornerRadius) => update({ cornerRadius })} />
      ) : null}
      <span className="quick-toolbar__divider" />
    </>
  );
}
