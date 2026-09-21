"use client";
import type { ShapeElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { ColorPicker } from "../../../ui/ColorPicker";
import { NumberField } from "../../../ui/NumberField";

interface ShapeSectionProps {
  element: ShapeElement;
}

/** Fill, outline and corner radius for a shape. */
export function ShapeSection({ element }: ShapeSectionProps) {
  const update = (patch: Partial<ShapeElement>) => useProjectStore.getState().updateElement(element.id, patch);
  const strokeOnly = element.shape === "line" || element.shape === "arrow";

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Style</span>
      <div className="row" style={{ alignItems: "flex-end" }}>
        {strokeOnly ? null : (
          <ColorPicker label="Fill" value={element.fill} allowTransparent onChange={(fill) => update({ fill })} />
        )}
        <ColorPicker label={strokeOnly ? "Colour" : "Outline"} value={element.stroke === "transparent" && strokeOnly ? element.fill : element.stroke}
          allowTransparent={!strokeOnly} onChange={(stroke) => update({ stroke })} />
        <NumberField label={strokeOnly ? "Thickness" : "Outline width"} value={element.strokeWidth} min={0} max={200} suffix="px"
          onCommit={(strokeWidth) => update({ strokeWidth })} />
      </div>
      {element.shape === "rectangle" ? (
        <NumberField label="Corner radius" value={element.cornerRadius} min={0} max={1000} suffix="px" onCommit={(cornerRadius) => update({ cornerRadius })} />
      ) : null}
    </section>
  );
}
