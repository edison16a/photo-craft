"use client";
import { SHAPE_CATALOG } from "@/data/shapes";
import { useAddElement } from "@/hooks/use-add-element";
import { ShapePreview } from "./sections/ElementPreview";

/** Grid of simple shapes. Click one to drop it in the middle of the page. */
export function ShapesPanel() {
  const { addShape } = useAddElement();
  return (
    <div className="stack">
      <div className="shape-grid">
        {SHAPE_CATALOG.map((option) => (
          <button key={option.kind} type="button" className="shape-tile" title={option.label} onClick={() => addShape(option.kind)}>
            <ShapePreview kind={option.kind} fill="#4da3ff" stroke="#111214" size={44} />
            <span className="small">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="small muted">Shapes can be stretched freely. Change fill, outline and corner radius from the selection panel.</p>
    </div>
  );
}
