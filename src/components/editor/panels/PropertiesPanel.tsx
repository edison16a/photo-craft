"use client";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";
import { ArrangeSection } from "./sections/ArrangeSection";
import { ElementPreview } from "./sections/ElementPreview";
import { ShapeSection } from "./sections/ShapeSection";
import { TextSection } from "./sections/TextSection";
import { TransformSection } from "./sections/TransformSection";

const TYPE_LABEL = { text: "Text", shape: "Shape", image: "Image" } as const;

/** Everything about the selected element, or the shared actions for several. */
export function PropertiesPanel() {
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const elements = useProjectStore(selectCurrentElements);
  const selected = elements.filter((el) => selectedIds.includes(el.id));

  if (selected.length === 0) return <p className="muted">Nothing selected.</p>;

  if (selected.length > 1) {
    return (
      <div className="stack" style={{ gap: 18 }}>
        <p className="muted">{selected.length} items selected. Drag any of them to move them all.</p>
        <ArrangeSection elements={selected} />
      </div>
    );
  }

  const element = selected[0];
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <ElementPreview element={element} />
        <div className="stack" style={{ gap: 2 }}>
          <span style={{ fontWeight: 600 }}>{TYPE_LABEL[element.type]}</span>
          <span className="small muted">
            {Math.round(element.width)} x {Math.round(element.height)} px
          </span>
          {element.locked ? <span className="small muted">Locked</span> : null}
        </div>
      </div>
      {element.type === "text" ? <TextSection key={element.id} element={element} /> : null}
      {element.type === "shape" ? <ShapeSection key={element.id} element={element} /> : null}
      <TransformSection key={element.id} element={element} />
      <ArrangeSection elements={[element]} />
    </div>
  );
}
