"use client";
import type { ShapeElement } from "@/model/types";
import { useLiveElementUpdate } from "@/hooks/use-live-element-update";
import { ColorPicker } from "../../../ui/ColorPicker";
import { shapeGeometry } from "@/data/shapes";
import { NumberField } from "../../../ui/NumberField";
import { RangeField } from "../../../ui/RangeField";
import { Toggle } from "../../../ui/Toggle";

interface ShapeSectionProps {
  element: ShapeElement;
}

/** Fill, outline, a rounding slider for anything with corners, and a closed switch for drawn shapes. */
export function ShapeSection({ element }: ShapeSectionProps) {
  const live = useLiveElementUpdate([element.id]);
  const preview = (patch: Partial<ShapeElement>) => live.preview(patch);
  const update = (patch: Partial<ShapeElement>) => live.commit(patch);
  const strokeOnly = element.shape === "line" || element.shape === "arrow" || (element.shape === "custom" && element.closed === false);
  const geometry = shapeGeometry(element.shape);
  const roundable = geometry === "rect" || geometry === "polygon" || geometry === "custom";
  const maxRadius = Math.max(1, Math.floor(Math.min(element.width, element.height) / 2));

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Style</span>
      <div className="row" style={{ alignItems: "flex-end" }}>
        {strokeOnly ? null : (
          <ColorPicker label="Fill" value={element.fill} allowTransparent onChange={(fill) => update({ fill })} onPreview={(fill) => preview({ fill })} />
        )}
        <ColorPicker label={strokeOnly ? "Colour" : "Outline"} value={element.stroke === "transparent" && strokeOnly ? element.fill : element.stroke}
          allowTransparent={!strokeOnly} onChange={(stroke) => update({ stroke })} onPreview={(stroke) => preview({ stroke })} />
        <NumberField label={strokeOnly ? "Thickness" : "Outline width"} value={element.strokeWidth} min={0} max={200} suffix="px"
          onPreview={(strokeWidth) => preview({ strokeWidth })} onCommit={(strokeWidth) => update({ strokeWidth })} />
      </div>
      {roundable ? (
        <RangeField label="Corner rounding" value={element.cornerRadius} min={0} max={maxRadius} suffix=" px"
          onPreview={(cornerRadius) => preview({ cornerRadius })} onCommit={(cornerRadius) => update({ cornerRadius })} />
      ) : null}
      {element.shape === "custom" ? <Toggle checked={element.closed ?? true} onChange={(closed) => update({ closed })} label="Closed shape" /> : null}
    </section>
  );
}
