"use client";
import { useLiveElementUpdate } from "@/hooks/use-live-element-update";
import type { CanvasElement } from "@/model/types";
import { NumberField } from "../../../ui/NumberField";
import { OpacitySlider } from "../../../ui/OpacitySlider";
import { ScaleSlider } from "../../../ui/ScaleSlider";

interface TransformSectionProps {
  element: CanvasElement;
}

type SizePatch = Partial<CanvasElement> & { fontSize?: number };

/** Resizes while keeping the aspect ratio, which is what images and text need. */
function widthKeepingRatio(element: CanvasElement, width: number): SizePatch {
  const ratio = element.height / element.width;
  const patch: SizePatch = { width, height: Math.round(width * ratio * 100) / 100 };
  if (element.type === "text") patch.fontSize = Math.max(1, Math.round((element.fontSize * width) / element.width));
  return patch;
}

function heightKeepingRatio(element: CanvasElement, height: number): SizePatch {
  const ratio = element.width / element.height;
  return { height, width: Math.round(height * ratio * 100) / 100 };
}

/**
 * Position, size, rotation, scale and opacity of one element. Every field
 * updates the canvas as you type or drag and records one undo step when
 * you finish.
 */
export function TransformSection({ element }: TransformSectionProps) {
  const { preview, commit } = useLiveElementUpdate([element.id]);
  const locked = element.locked;
  const freeform = element.type === "shape";
  const scalePercent = element.type === "image" ? Math.round((element.width / element.naturalWidth) * 100) : null;
  const widthPatch = (w: number) => (freeform ? { width: w } : widthKeepingRatio(element, w));
  const heightPatch = (h: number) => (freeform ? { height: h } : heightKeepingRatio(element, h));
  const imageScalePatch = (p: number) =>
    element.type === "image" ? widthKeepingRatio(element, Math.round((element.naturalWidth * p) / 100)) : {};

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Position and size</span>
      <div className="row">
        <NumberField label="X" value={element.x} suffix="px" disabled={locked} onPreview={(x) => preview({ x })} onCommit={(x) => commit({ x })} />
        <NumberField label="Y" value={element.y} suffix="px" disabled={locked} onPreview={(y) => preview({ y })} onCommit={(y) => commit({ y })} />
      </div>
      <div className="row">
        <NumberField label="Width" value={element.width} min={4} suffix="px" disabled={locked}
          onPreview={(w) => preview(widthPatch(w))} onCommit={(w) => commit(widthPatch(w))} />
        <NumberField label="Height" value={element.height} min={4} suffix="px" disabled={locked || element.type === "text"}
          onPreview={(h) => preview(heightPatch(h))} onCommit={(h) => commit(heightPatch(h))} />
      </div>
      <div className="row">
        <NumberField label="Rotation" value={element.rotation} min={-360} max={360} suffix="deg" disabled={locked}
          normalize={(r) => ((r % 360) + 360) % 360} onPreview={(rotation) => preview({ rotation })} onCommit={(rotation) => commit({ rotation })} />
        {scalePercent !== null ? (
          <NumberField label="Scale" value={scalePercent} min={1} max={2000} suffix="%" disabled={locked}
            onPreview={(p) => preview(imageScalePatch(p))} onCommit={(p) => commit(imageScalePatch(p))} />
        ) : (
          <NumberField label="Opacity" value={Math.round(element.opacity * 100)} min={0} max={100} suffix="%"
            onPreview={(o) => preview({ opacity: o / 100 })} onCommit={(o) => commit({ opacity: o / 100 })} />
        )}
      </div>
      <ScaleSlider element={element} onPreview={preview} onCommit={commit} />
      <OpacitySlider value={element.opacity} onPreview={(opacity) => preview({ opacity })} onCommit={(opacity) => commit({ opacity })} />
      {element.type === "image" ? (
        <p className="small muted">Original {element.naturalWidth} x {element.naturalHeight} px. Proportions are always kept.</p>
      ) : null}
    </section>
  );
}
