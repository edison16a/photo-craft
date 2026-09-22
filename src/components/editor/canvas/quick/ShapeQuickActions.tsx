"use client";
import type { ShapeElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { ColorPicker } from "../../../ui/ColorPicker";
import { NumberField } from "../../../ui/NumberField";

interface ShapeQuickActionsProps {
  element: ShapeElement;
}

/** Fill, outline and corner radius for a shape. */
export function ShapeQuickActions({ element }: ShapeQuickActionsProps) {
  const update = (patch: Partial<ShapeElement>) => useProjectStore.getState().updateElement(element.id, patch);
  const strokeOnly = element.shape === "line" || element.shape === "arrow";
  return (
    <>
      {strokeOnly ? null : (
        <ColorPicker compact label="Fill" value={element.fill} allowTransparent onChange={(fill) => update({ fill })} />
      )}
      <ColorPicker
        compact
        label={strokeOnly ? "Colour" : "Outline"}
        value={element.stroke === "transparent" && strokeOnly ? element.fill : element.stroke}
        allowTransparent={!strokeOnly}
        onChange={(stroke) => update({ stroke })}
      />
      <NumberField compact label={strokeOnly ? "Thickness" : "Outline width"} value={element.strokeWidth} min={0} max={200} onCommit={(strokeWidth) => update({ strokeWidth })} />
      {element.shape === "rectangle" ? (
        <NumberField compact label="Corner radius" value={element.cornerRadius} min={0} max={1000} onCommit={(cornerRadius) => update({ cornerRadius })} />
      ) : null}
      <span className="quick-toolbar__divider" />
    </>
  );
}
