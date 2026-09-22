"use client";
import type { CanvasElement } from "@/model/types";
import type { Alignment } from "@/store/alignment";
import { useProjectStore } from "@/store/project-store";
import { IconButton } from "../../../ui/IconButton";
import type { IconName } from "../../../ui/icon-paths";

interface MultiQuickActionsProps {
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

/** Alignment buttons for several selected elements. */
export function MultiQuickActions({ elements }: MultiQuickActionsProps) {
  const ids = elements.map((el) => el.id);
  return (
    <>
      <span className="small muted" style={{ padding: "0 4px" }}>{elements.length} items</span>
      {ALIGNMENTS.map((item) => (
        <IconButton key={item.id} icon={item.icon} label={item.label} onClick={() => useProjectStore.getState().align(ids, item.id)} />
      ))}
      <span className="quick-toolbar__divider" />
    </>
  );
}
