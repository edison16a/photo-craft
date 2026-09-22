"use client";
import type { CanvasElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { NumberField } from "../../../ui/NumberField";
import { OpacitySlider } from "../../../ui/OpacitySlider";

interface TransformSectionProps {
  element: CanvasElement;
}

/** Position, size, rotation, scale and opacity of one element. */
export function TransformSection({ element }: TransformSectionProps) {
  const update = (patch: Partial<CanvasElement>) => useProjectStore.getState().updateElement(element.id, patch);
  const locked = element.locked;

  /** Resizes while keeping the aspect ratio, which is what images and text need. */
  const setWidthKeepRatio = (width: number) => {
    const ratio = element.height / element.width;
    const patch: Partial<CanvasElement> & { fontSize?: number } = { width, height: Math.round(width * ratio * 100) / 100 };
    if (element.type === "text") patch.fontSize = Math.max(1, Math.round((element.fontSize * width) / element.width));
    update(patch);
  };

  const setHeightKeepRatio = (height: number) => {
    const ratio = element.width / element.height;
    update({ height, width: Math.round(height * ratio * 100) / 100 });
  };

  const freeform = element.type === "shape";
  const scalePercent = element.type === "image" ? Math.round((element.width / element.naturalWidth) * 100) : null;

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Position and size</span>
      <div className="row">
        <NumberField label="X" value={element.x} suffix="px" disabled={locked} onCommit={(x) => update({ x })} />
        <NumberField label="Y" value={element.y} suffix="px" disabled={locked} onCommit={(y) => update({ y })} />
      </div>
      <div className="row">
        <NumberField label="Width" value={element.width} min={4} suffix="px" disabled={locked}
          onCommit={(w) => (freeform ? update({ width: w }) : setWidthKeepRatio(w))} />
        <NumberField label="Height" value={element.height} min={4} suffix="px" disabled={locked || element.type === "text"}
          onCommit={(h) => (freeform ? update({ height: h }) : setHeightKeepRatio(h))} />
      </div>
      <div className="row">
        <NumberField label="Rotation" value={element.rotation} min={-360} max={360} suffix="deg" disabled={locked}
          normalize={(r) => ((r % 360) + 360) % 360} onCommit={(rotation) => update({ rotation })} />
        {scalePercent !== null ? (
          <NumberField label="Scale" value={scalePercent} min={1} max={2000} suffix="%" disabled={locked}
            onCommit={(p) => element.type === "image" && setWidthKeepRatio(Math.round((element.naturalWidth * p) / 100))} />
        ) : (
          <NumberField label="Opacity" value={Math.round(element.opacity * 100)} min={0} max={100} suffix="%" onCommit={(o) => update({ opacity: o / 100 })} />
        )}
      </div>
      {scalePercent !== null ? (
        <OpacitySlider value={element.opacity} onCommit={(opacity) => update({ opacity })} />
      ) : null}
      {element.type === "image" ? (
        <p className="small muted">Original {element.naturalWidth} x {element.naturalHeight} px. Proportions are always kept.</p>
      ) : null}
    </section>
  );
}
