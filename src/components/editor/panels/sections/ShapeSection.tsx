"use client";
import type { ShapeElement } from "@/model/types";
import { useLiveElementUpdate } from "@/hooks/use-live-element-update";
import { ColorPicker } from "../../../ui/ColorPicker";
import { NumberField } from "../../../ui/NumberField";
import { Toggle } from "../../../ui/Toggle";
import { CURVE_TENSION } from "@/lib/drawing";

interface ShapeSectionProps {
  element: ShapeElement;
}

/** Fill, outline, corner radius and, for drawn shapes, curved and closed sides. */
export function ShapeSection({ element }: ShapeSectionProps) {
  const live = useLiveElementUpdate([element.id]);
  const preview = (patch: Partial<ShapeElement>) => live.preview(patch);
  const update = (patch: Partial<ShapeElement>) => live.commit(patch);
  const strokeOnly = element.shape === "line" || element.shape === "arrow" || (element.shape === "custom" && element.closed === false);

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
      {element.shape === "rectangle" ? (
        <NumberField label="Corner radius" value={element.cornerRadius} min={0} max={1000} suffix="px"
          onPreview={(cornerRadius) => preview({ cornerRadius })} onCommit={(cornerRadius) => update({ cornerRadius })} />
      ) : null}
      {element.shape === "custom" ? (
        <div className="stack" style={{ gap: 8 }}>
          <Toggle checked={(element.tension ?? 0) > 0} onChange={(curved) => update({ tension: curved ? CURVE_TENSION : 0 })} label="Curved sides" />
          <Toggle checked={element.closed ?? true} onChange={(closed) => update({ closed })} label="Closed shape" />
        </div>
      ) : null}
    </section>
  );
}
