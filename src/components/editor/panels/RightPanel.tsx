"use client";
import { useEffect } from "react";
import { useEditorUiStore, type PanelKind } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { DrawPanel } from "./DrawPanel";
import { PagePanel } from "./PagePanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { ShapesPanel } from "./ShapesPanel";
import { TextPanel } from "./TextPanel";
import { UploadPanel } from "./UploadPanel";

const TITLES: Record<PanelKind, string> = {
  properties: "Selection",
  page: "Page",
  text: "Text",
  shapes: "Shapes",
  draw: "Draw a shape",
  upload: "Upload",
};

/**
 * The panel on the right. Selecting something shows its properties.
 * Picking a tool shows that tool's panel. With nothing selected and the
 * pointer tool active it shows the page settings. There is no heading:
 * the contents say what they are, and the select tool or Escape leaves
 * a tool's panel.
 */
export function RightPanel() {
  const panel = useEditorUiStore((s) => s.panel);
  const tool = useEditorUiStore((s) => s.tool);
  const hasSelection = useProjectStore((s) => s.selectedIds.length > 0);

  useEffect(() => {
    const ui = useEditorUiStore.getState();
    if (hasSelection && ui.tool === "select") ui.openPanel("properties");
    if (!hasSelection && ui.panel === "properties") ui.openPanel("page");
  }, [hasSelection]);

  // With the pointer tool, a selection always wins over the page panel.
  const pointerWithSelection = hasSelection && tool === "select" && (panel === "page" || panel === "properties");
  const shown: PanelKind = pointerWithSelection ? "properties" : panel === "properties" && !hasSelection ? "page" : panel;

  return (
    <aside className="panel" aria-label={TITLES[shown]}>
      <div className="panel__body">
        {shown === "properties" ? <PropertiesPanel /> : null}
        {shown === "page" ? <PagePanel /> : null}
        {shown === "text" ? <TextPanel /> : null}
        {shown === "shapes" ? <ShapesPanel /> : null}
        {shown === "draw" ? <DrawPanel /> : null}
        {shown === "upload" ? <UploadPanel /> : null}
      </div>
    </aside>
  );
}
