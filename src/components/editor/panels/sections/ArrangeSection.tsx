"use client";
import type { CanvasElement } from "@/model/types";
import type { Alignment } from "@/store/alignment";
import { useProjectStore } from "@/store/project-store";
import { IconButton } from "../../../ui/IconButton";
import type { IconName } from "../../../ui/icon-paths";

interface ArrangeSectionProps {
  elements: CanvasElement[];
}

const ALIGNMENTS: { id: Alignment; icon: IconName; label: string }[] = [
  { id: "left", icon: "alignLeft", label: "Align left" },
  { id: "centerX", icon: "alignCenterX", label: "Align centre" },
  { id: "right", icon: "alignRight", label: "Align right" },
  { id: "top", icon: "alignTop", label: "Align top" },
  { id: "centerY", icon: "alignCenterY", label: "Align middle" },
  { id: "bottom", icon: "alignBottom", label: "Align bottom" },
];

/** Lock, flip, layer order, alignment, duplicate and delete for the selection. */
export function ArrangeSection({ elements }: ArrangeSectionProps) {
  const ids = elements.map((el) => el.id);
  const store = useProjectStore.getState;
  const allLocked = elements.every((el) => el.locked);
  const anyLocked = elements.some((el) => el.locked);
  const single = elements.length === 1;

  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="label">Arrange</span>
      <div className="row row--wrap">
        <IconButton icon={allLocked ? "lock" : "unlock"} label={allLocked ? "Unlock" : "Lock position and size"} active={anyLocked}
          onClick={() => store().setLocked(ids, !allLocked)} />
        <IconButton icon="flipH" label="Flip horizontally" onClick={() => store().flip(ids, "x")} />
        <IconButton icon="flipV" label="Flip vertically" onClick={() => store().flip(ids, "y")} />
        <IconButton icon="rotate" label="Rotate 90 degrees" disabled={anyLocked}
          onClick={() => store().patchElements(Object.fromEntries(elements.map((el) => [el.id, { rotation: (el.rotation + 90) % 360 }])))} />
        <span className="small muted" style={{ marginLeft: 4 }}>{allLocked ? "Locked" : ""}</span>
      </div>
      <span className="small muted">Layer order</span>
      <div className="row row--wrap">
        <IconButton icon="toFront" label="Bring to front" onClick={() => store().reorder(ids, "front")} />
        <IconButton icon="forward" label="Bring forward" onClick={() => store().reorder(ids, "forward")} />
        <IconButton icon="backward" label="Send backward" onClick={() => store().reorder(ids, "backward")} />
        <IconButton icon="toBack" label="Send to back" onClick={() => store().reorder(ids, "back")} />
      </div>
      <span className="small muted">{single ? "Align to page" : "Align selection"}</span>
      <div className="row row--wrap">
        {ALIGNMENTS.map((item) => (
          <IconButton key={item.id} icon={item.icon} label={item.label} onClick={() => store().align(ids, item.id)} />
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn btn--sm" onClick={() => store().duplicateElements(ids)}>
          Duplicate
        </button>
        <button type="button" className="btn btn--sm btn--danger" onClick={() => store().removeElements(ids)}>
          Delete
        </button>
      </div>
    </section>
  );
}
